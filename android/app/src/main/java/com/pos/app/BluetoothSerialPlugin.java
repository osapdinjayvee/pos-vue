package com.pos.app;

import android.Manifest;
import android.bluetooth.BluetoothAdapter;
import android.bluetooth.BluetoothDevice;
import android.bluetooth.BluetoothSocket;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.PackageManager;
import android.os.Build;
import android.util.Base64;
import android.util.Log;

import androidx.core.app.ActivityCompat;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;

import org.json.JSONException;

import java.io.IOException;
import java.io.OutputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@CapacitorPlugin(
    name = "BluetoothSerial",
    permissions = {
        @Permission(
            alias = "bluetooth",
            strings = {
                Manifest.permission.BLUETOOTH,
                Manifest.permission.BLUETOOTH_ADMIN,
                Manifest.permission.ACCESS_FINE_LOCATION
            }
        ),
        @Permission(
            alias = "bluetoothConnect",
            strings = {
                Manifest.permission.BLUETOOTH_CONNECT,
                Manifest.permission.BLUETOOTH_SCAN
            }
        )
    }
)
public class BluetoothSerialPlugin extends Plugin {

    private static final String TAG = "BluetoothSerial";
    private static final UUID SPP_UUID = UUID.fromString("00001101-0000-1000-8000-00805F9B34FB");

    private BluetoothAdapter bluetoothAdapter;
    private BluetoothSocket socket;
    private OutputStream outputStream;
    private final List<JSObject> discoveredDevices = new ArrayList<>();
    private PluginCall scanCall;

    private final BroadcastReceiver discoveryReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            String action = intent.getAction();
            if (BluetoothDevice.ACTION_FOUND.equals(action)) {
                BluetoothDevice device = intent.getParcelableExtra(BluetoothDevice.EXTRA_DEVICE);
                if (device != null) {
                    JSObject jsDevice = new JSObject();
                    String name = "Unknown Device";
                    try {
                        name = device.getName();
                        if (name == null) name = "Unknown Device";
                    } catch (SecurityException e) {
                        Log.w(TAG, "No permission to get device name");
                    }
                    jsDevice.put("name", name);
                    jsDevice.put("address", device.getAddress());
                    jsDevice.put("id", device.getAddress());
                    jsDevice.put("class", device.getBluetoothClass().getMajorDeviceClass());
                    discoveredDevices.add(jsDevice);
                }
            } else if (BluetoothAdapter.ACTION_DISCOVERY_FINISHED.equals(action)) {
                if (scanCall != null) {
                    JSObject result = new JSObject();
                    JSArray devArray = new JSArray();
                    for (JSObject d : discoveredDevices) {
                        devArray.put(d);
                    }
                    result.put("devices", devArray);
                    scanCall.resolve(result);
                    scanCall = null;
                }
            }
        }
    };

    @Override
    public void load() {
        bluetoothAdapter = BluetoothAdapter.getDefaultAdapter();
    }

    private boolean hasBluetoothPermissions() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
            return ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_CONNECT) == PackageManager.PERMISSION_GRANTED
                && ActivityCompat.checkSelfPermission(getContext(), Manifest.permission.BLUETOOTH_SCAN) == PackageManager.PERMISSION_GRANTED;
        }
        return true;
    }

    @PluginMethod
    public void isEnabled(PluginCall call) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S && !hasBluetoothPermissions()) {
            requestAllPermissions(call, "handlePermissionResult");
            return;
        }
        JSObject result = new JSObject();
        result.put("enabled", bluetoothAdapter != null && bluetoothAdapter.isEnabled());
        call.resolve(result);
    }

    @PermissionCallback
    private void handlePermissionResult(PluginCall call) {
        JSObject result = new JSObject();
        result.put("enabled", bluetoothAdapter != null && bluetoothAdapter.isEnabled());
        call.resolve(result);
    }

    @PluginMethod
    public void list(PluginCall call) {
        if (!hasBluetoothPermissions()) {
            requestAllPermissions(call, "handleListPermission");
            return;
        }
        resolveDeviceList(call);
    }

    @PermissionCallback
    private void handleListPermission(PluginCall call) {
        resolveDeviceList(call);
    }

    private void resolveDeviceList(PluginCall call) {
        JSObject result = new JSObject();
        JSArray devices = new JSArray();

        if (bluetoothAdapter != null) {
            try {
                Set<BluetoothDevice> bonded = bluetoothAdapter.getBondedDevices();
                if (bonded != null) {
                    for (BluetoothDevice device : bonded) {
                        JSObject jsDevice = new JSObject();
                        String name;
                        try {
                            name = device.getName();
                            if (name == null) name = "Unknown Device";
                        } catch (SecurityException e) {
                            name = "Unknown Device";
                        }
                        jsDevice.put("name", name);
                        jsDevice.put("address", device.getAddress());
                        jsDevice.put("id", device.getAddress());
                        jsDevice.put("class", device.getBluetoothClass().getMajorDeviceClass());
                        devices.put(jsDevice);
                    }
                }
            } catch (SecurityException e) {
                Log.e(TAG, "Permission denied listing devices", e);
            }
        }

        result.put("devices", devices);
        call.resolve(result);
    }

    @PluginMethod
    public void scan(PluginCall call) {
        if (!hasBluetoothPermissions()) {
            requestAllPermissions(call, "handleScanPermission");
            return;
        }
        startDiscovery(call);
    }

    @PermissionCallback
    private void handleScanPermission(PluginCall call) {
        startDiscovery(call);
    }

    private void startDiscovery(PluginCall call) {
        if (bluetoothAdapter == null) {
            call.reject("Bluetooth not available");
            return;
        }

        discoveredDevices.clear();
        scanCall = call;

        IntentFilter filter = new IntentFilter();
        filter.addAction(BluetoothDevice.ACTION_FOUND);
        filter.addAction(BluetoothAdapter.ACTION_DISCOVERY_FINISHED);

        try {
            getContext().registerReceiver(discoveryReceiver, filter);
            bluetoothAdapter.startDiscovery();
        } catch (SecurityException e) {
            call.reject("Bluetooth scan permission denied");
        }
    }

    @PluginMethod
    public void connect(PluginCall call) {
        String address = call.getString("address");
        if (address == null || address.isEmpty()) {
            call.reject("Address is required");
            return;
        }

        // Run connection in background thread
        new Thread(() -> {
            try {
                // Disconnect existing
                closeSocket();

                BluetoothDevice device = bluetoothAdapter.getRemoteDevice(address);

                // Cancel discovery if running
                try {
                    if (bluetoothAdapter.isDiscovering()) {
                        bluetoothAdapter.cancelDiscovery();
                    }
                } catch (SecurityException ignored) {}

                socket = device.createRfcommSocketToServiceRecord(SPP_UUID);
                socket.connect();
                outputStream = socket.getOutputStream();

                call.resolve();
            } catch (SecurityException e) {
                call.reject("Bluetooth connect permission denied");
            } catch (IOException e) {
                closeSocket();
                call.reject("Failed to connect: " + e.getMessage());
            }
        }).start();
    }

    @PluginMethod
    public void disconnect(PluginCall call) {
        closeSocket();
        call.resolve();
    }

    @PluginMethod
    public void isConnected(PluginCall call) {
        JSObject result = new JSObject();
        result.put("connected", socket != null && socket.isConnected());
        call.resolve(result);
    }

    @PluginMethod
    public void write(PluginCall call) {
        String value = call.getString("value");
        if (value == null) {
            call.reject("Value is required");
            return;
        }

        if (outputStream == null) {
            call.reject("Not connected to a device");
            return;
        }

        try {
            byte[] data = Base64.decode(value, Base64.DEFAULT);
            outputStream.write(data);
            outputStream.flush();
            call.resolve();
        } catch (IOException e) {
            call.reject("Write failed: " + e.getMessage());
        } catch (IllegalArgumentException e) {
            call.reject("Invalid base64 data");
        }
    }

    private void closeSocket() {
        try {
            if (outputStream != null) {
                outputStream.close();
                outputStream = null;
            }
        } catch (IOException ignored) {}

        try {
            if (socket != null) {
                socket.close();
                socket = null;
            }
        } catch (IOException ignored) {}
    }

    @Override
    protected void handleOnDestroy() {
        closeSocket();
        try {
            getContext().unregisterReceiver(discoveryReceiver);
        } catch (Exception ignored) {}
    }
}
