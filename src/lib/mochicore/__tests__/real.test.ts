import { WalletCore } from "@/lib/core/wallet"
import { HDWallet } from "../hdwallet"
import { MochimoService } from "@/lib/services/mochimo"
import { Transaction } from "../transaction"

describe('Mochimo Core', () => {
  it('Transaction:: wallet can transfer mochimo', async () => {
    const masterSeed = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'
    const hdwallet = new HDWallet(masterSeed)
    const account = hdwallet.createAccount(0)
    const destAccount = hdwallet.createAccount(1)
    expect(account).toBeDefined()
    expect(account.getTag()).toBeDefined()
    expect(account.getWotsAddress(0)).toBeDefined()
    expect(account.getWotsAddress(0)).toBeDefined()

    //activate the account
    const response = await MochimoService.activateTag(account.getWotsAddress(0))
    const response2 = await MochimoService.activateTag(destAccount.getWotsAddress(0))

    console.log(response, response2)
    expect(response).toBeDefined()
    expect(response.success).toBe(true)
    expect(response2).toBeDefined()
    const res = await MochimoService.resolveTag(account.getTag())
    expect(res).toBeDefined()
    expect(res.success).toBe(true)

    expect(res.balanceConsensus).toBeDefined()
    const balance = res.balanceConsensus
    expect(res.addressConsensus).toBe(account.getWotsAddress(0))
    const res2 = await MochimoService.resolveTag(destAccount.getTag())
    // expect(res2.addressConsensus).not.toBeNull()

    const amountNano = parseInt(parseFloat("0.01").toFixed(9).toString().replaceAll(".", ""))
    const changeAmount = BigInt(balance) - BigInt(amountNano) - BigInt(500)
    console.log("Senders balance", account.getTag(), balance)
    console.log("Receivers balance", destAccount.getTag(), res2.balanceConsensus)
    expect(res2.addressConsensus).toBe(destAccount.getWotsAddress(0))
    const tx =  Transaction.sign({
      balance: BigInt(balance),
      //fee is 500 nano mochimo
      fee: BigInt(500),
      source: new Uint8Array(Buffer.from(account.getWotsAddress(0), 'hex')),
      destination: new Uint8Array(Buffer.from(destAccount.getWotsAddress(0), 'hex')),
      change: new Uint8Array(Buffer.from(account.getWotsAddress(1), 'hex')),
      payment: BigInt(amountNano),
      changeAmount: changeAmount,
      wotsSeed: Buffer.from(account.getWotsSeed(0)).toString('hex'),
    })
    console.log(tx)
    const push = await MochimoService.pushTransaction(Buffer.from(tx).toString('base64'))
    console.log(push)
  })
})
