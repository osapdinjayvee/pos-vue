import { creditLedgerRepository } from '@/repositories/creditLedgerRepository'
import { customerRepository } from '@/repositories/customerRepository'
import type { CreditValidation, CreditPaymentInput } from '@/types/credit'

class CreditService {
  /**
   * Validate whether a credit (utang) payment is allowed
   */
  async validateCreditPayment(customerId: string, amount: number): Promise<CreditValidation> {
    const customer = await customerRepository.findById(customerId)
    if (!customer) {
      return { allowed: false, availableCredit: 0, creditLimit: 0, currentBalance: 0, reason: 'Customer not found' }
    }

    const creditLimit = customer.credit_limit ?? 0
    const currentBalance = customer.current_balance ?? 0
    const availableCredit = creditLimit - currentBalance

    if (creditLimit <= 0) {
      return { allowed: false, availableCredit: 0, creditLimit, currentBalance, reason: 'Customer has no credit limit' }
    }

    if (amount > availableCredit) {
      return { allowed: false, availableCredit, creditLimit, currentBalance, reason: `Exceeds available credit (₱${availableCredit.toFixed(2)})` }
    }

    return { allowed: true, availableCredit, creditLimit, currentBalance }
  }

  /**
   * Charge a purchase to the customer's account (utang)
   */
  async chargeToAccount(customerId: string, amount: number, transactionId: string, userId: string): Promise<void> {
    // Validate
    const validation = await this.validateCreditPayment(customerId, amount)
    if (!validation.allowed) {
      throw new Error(validation.reason || 'Credit payment not allowed')
    }

    // Record ledger entry (uses current balance before update for running_balance calc)
    await creditLedgerRepository.recordCharge(customerId, amount, transactionId, userId)

    // Update customer balance (increase)
    await customerRepository.updateBalance(customerId, amount)
  }

  /**
   * Receive payment against outstanding balance (bayad utang)
   */
  async receivePayment(input: CreditPaymentInput, userId: string): Promise<void> {
    const customer = await customerRepository.findById(input.customerId)
    if (!customer) throw new Error('Customer not found')

    const currentBalance = customer.current_balance ?? 0
    if (input.amount <= 0) throw new Error('Payment amount must be greater than zero')
    if (input.amount > currentBalance) throw new Error(`Payment amount exceeds outstanding balance (₱${currentBalance.toFixed(2)})`)

    // Record ledger entry
    await creditLedgerRepository.recordPayment(
      input.customerId,
      input.amount,
      input.paymentMethod,
      userId,
      { referenceNumber: input.referenceNumber, notes: input.notes }
    )

    // Update customer balance (decrease)
    await customerRepository.updateBalance(input.customerId, -input.amount)
  }

  /**
   * Reverse a credit charge (used when voiding a transaction)
   */
  async reverseCharge(transactionId: string, userId: string): Promise<void> {
    const chargeEntry = await creditLedgerRepository.findChargeByTransaction(transactionId)
    if (!chargeEntry) return // No credit charge to reverse

    // Record a payment entry as reversal
    await creditLedgerRepository.recordPayment(
      chargeEntry.customer_id,
      chargeEntry.amount,
      'void_reversal',
      userId,
      { notes: `Void reversal for transaction ${transactionId}` }
    )

    // Decrease customer balance
    await customerRepository.updateBalance(chargeEntry.customer_id, -chargeEntry.amount)
  }
}

export const creditService = new CreditService()
