const { expectThrow } = require('./utils');
const ERCToken = artifacts.require('ERCToken')
const TokenExchange = artifacts.require('TokenExchange')

contract('ERCToken', function (accounts) {
  let token
  let exchange

  // before each, deploy both of these jawns
  beforeEach(async () => {
    token = await ERCToken.new(10000, {from: accounts[0]})
    exchange = await TokenExchange.new()
  });


  it('deposit: should allow user to deposit after approve', async () => {
    await token.approve(exchange.address, 100, {from: accounts[0]})
    await exchange.depositToken(token.address, 100, {from: accounts[0]});
    const balance = await exchange.getTokenBalance.call(accounts[0], token.address);
    assert.strictEqual(balance.toNumber(), 100);
  });

  it('deposit: should not allow user to deposit without approve', async () => {
    await expectThrow(exchange.depositToken(token.address, 100, {from: accounts[0]}));
  });

  // should allow a user to deposit two tokens

  describe('after deposit', () => {
    beforeEach(async () => {
      await token.approve(exchange.address, 100, {from: accounts[0]})
      await exchange.depositToken(token.address, 100, {from: accounts[0]});
    });

    it('sell: should allow user to sell deposited tokens', async () => {
      await exchange.sellTokens(token.address, 100, 1, {from: accounts[0]})
    });

    it('sell: should not allow user to sell non-deposited tokens', async () => {
      await expectThrow(exchange.sellTokens(token.address, 101, 1,{from: accounts[0]}));
    });

    it('sell: should allow users to change sell order', async () => {
      await exchange.sellTokens(token.address, 100, 1, {from: accounts[0]})
      await exchange.sellTokens(token.address, 100, 2, {from: accounts[0]})
      await exchange.sellTokens(token.address, 50, 3, {from: accounts[0]})
    });

    it('buy: should allow users to buy from a current sell order', async () => {
      await exchange.sellTokens(token.address, 100, 1, {from: accounts[0]})
      await exchange.buyTokens(accounts[0], token.address, 100, {from: accounts[1], value: 100})
      const balanceOne = await exchange.getTokenBalance.call(accounts[0], token.address);
      assert.strictEqual(balanceOne.toNumber(), 0);
      const etherBalance = await exchange.getEtherBalance.call(accounts[0]);
      assert.strictEqual(etherBalance.toNumber(), 100);
      const balanceTwo = await exchange.getTokenBalance.call(accounts[1], token.address);
      assert.strictEqual(balanceTwo.toNumber(), 100);
    });

    it('buy: should not allow users to buy when no sell order', async () => {
      await expectThrow(exchange.buyTokens(accounts[0], token.address, 100, {from: accounts[1], value: 100}))
    });

    it('buy: should allow users to buy only from most recent sell order', async () => {
      await exchange.sellTokens(token.address, 100, 1, {from: accounts[0]})
      await exchange.sellTokens(token.address, 100, 2, {from: accounts[0]})
      await expectThrow(exchange.buyTokens(accounts[0], token.address, 100, {from: accounts[1], value: 100}))
      await exchange.buyTokens(accounts[0], token.address, 100, {from: accounts[1], value: 200})
      const balanceOne = await exchange.getTokenBalance.call(accounts[0], token.address);
      assert.strictEqual(balanceOne.toNumber(), 0);
      const etherBalance = await exchange.getEtherBalance.call(accounts[0]);
      assert.strictEqual(etherBalance.toNumber(), 200);
      const balanceTwo = await exchange.getTokenBalance.call(accounts[1], token.address);
      assert.strictEqual(balanceTwo.toNumber(), 100);
    });

    it('buy: should allow multiple users to buy from sell order', async () => {
      await exchange.sellTokens(token.address, 100, 1, {from: accounts[0]})
      await exchange.buyTokens(accounts[0], token.address, 50, {from: accounts[1], value: 50})
      await exchange.buyTokens(accounts[0], token.address, 50, {from: accounts[2], value: 50})

      const etherBalance = await exchange.getEtherBalance.call(accounts[0]);
      assert.strictEqual(etherBalance.toNumber(), 100);

      const balanceOne = await exchange.getTokenBalance.call(accounts[1], token.address);
      assert.strictEqual(balanceOne.toNumber(), 50);
      const balanceTwo = await exchange.getTokenBalance.call(accounts[2], token.address);
      assert.strictEqual(balanceTwo.toNumber(), 50);
    });

    it('buy: should allow users to buy from and then sell tokens', async () => {
      await exchange.sellTokens(token.address, 100, 1, {from: accounts[0]})
      await exchange.buyTokens(accounts[0], token.address, 100, {from: accounts[1], value: 100})
      await exchange.sellTokens(token.address, 100, 2, {from: accounts[1]})
      await exchange.buyTokens(accounts[1], token.address, 100, {from: accounts[2], value: 200})

      const balanceOne = await exchange.getTokenBalance.call(accounts[0], token.address);
      assert.strictEqual(balanceOne.toNumber(), 0);
      const etherBalanceOne = await exchange.getEtherBalance.call(accounts[0]);
      assert.strictEqual(etherBalanceOne.toNumber(), 100);

      const balanceTwo = await exchange.getTokenBalance.call(accounts[1], token.address);
      assert.strictEqual(balanceTwo.toNumber(), 0);
      const etherBalanceTwo = await exchange.getEtherBalance.call(accounts[1]);
      assert.strictEqual(etherBalanceTwo.toNumber(), 200);

      const balanceThree = await exchange.getTokenBalance.call(accounts[2], token.address);
      assert.strictEqual(balanceThree.toNumber(), 100);
    });


    it('withdraw tokens: should allow users to withdraw deposted tokens', async () => {
      const tokenBalance = await exchange.getTokenBalance.call(accounts[0], token.address);
      assert.strictEqual(tokenBalance.toNumber(), 100);
      const tokenBalanceExchange = await token.balanceOf.call(exchange.address);
      assert.strictEqual(tokenBalanceExchange.toNumber(), 100);

      await exchange.withdrawToken(token.address, 100, {from: accounts[0]})

      const afterWithdrawBalance = await exchange.getTokenBalance.call(accounts[0], token.address);
      assert.strictEqual(afterWithdrawBalance.toNumber(), 0);
      const balanceInTokenContract = await token.balanceOf.call(accounts[0]);
      assert.strictEqual(balanceInTokenContract.toNumber(), 10000);

      const tokenBalanceExchangeAfterWithdraw = await token.balanceOf.call(exchange.address);
      assert.strictEqual(tokenBalanceExchangeAfterWithdraw.toNumber(), 0);
    });

    it('withdraw tokens: should allow users to only withdraw their own tokens', async () => {
      await token.transfer(accounts[1], 100)
      await token.approve(exchange.address, 100, {from: accounts[1]})
      await exchange.depositToken(token.address, 100, {from: accounts[1]});
      const tokenBalanceTwo = await exchange.getTokenBalance.call(accounts[0], token.address);
      assert.strictEqual(tokenBalanceTwo.toNumber(), 100);
      const tokenBalanceExchange = await token.balanceOf.call(exchange.address);
      assert.strictEqual(tokenBalanceExchange.toNumber(), 200);

      await expectThrow(exchange.withdrawToken(token.address, 101, {from: accounts[0]}))
      await expectThrow(exchange.withdrawToken(token.address, 101, {from: accounts[1]}))

      await exchange.withdrawToken(token.address, 100, {from: accounts[0]})
      await exchange.withdrawToken(token.address, 100, {from: accounts[1]})

      const tokenBalanceExchangeAfterWithdraw = await token.balanceOf.call(exchange.address);
      assert.strictEqual(tokenBalanceExchangeAfterWithdraw.toNumber(), 0);

      const afterWithdrawBalance = await exchange.getTokenBalance.call(accounts[0], token.address);
      assert.strictEqual(afterWithdrawBalance.toNumber(), 0);
      const balanceInTokenContract = await token.balanceOf.call(accounts[0]);
      assert.strictEqual(balanceInTokenContract.toNumber(), 9900);

      const balanceInTokenContractTwo = await token.balanceOf.call(accounts[1]);
      assert.strictEqual(balanceInTokenContractTwo.toNumber(), 100);
    });


    it('withdraw tokens: should clear sell orders for that token', async () => {
      await exchange.sellTokens(token.address, 100, 1, {from: accounts[0]})
      await exchange.withdrawToken(token.address, 100, {from: accounts[0]})

      await expectThrow(exchange.buyTokens(accounts[0], token.address, 100, {from: accounts[1], value: 100}))
    });

    it('withdraw ether: should allow users to withdraw ether they recieved from selling', async () => {
      await exchange.sellTokens(token.address, 100, 1, {from: accounts[0]})
      await exchange.buyTokens(accounts[0], token.address, 100, {from: accounts[1], value: 100})

      const balanceBefore = await web3.eth.getBalance(accounts[0])
      const exchangeBalance = await web3.eth.getBalance(exchange.address)
      const balanceInContract = await exchange.getEtherBalance.call(accounts[0])
      const tx = await exchange.withdrawEther({from: accounts[0]})
      const txCost = 100000000000 * tx.receipt.gasUsed // 100000000000 is the default gasPrice used by truffle
      const balanceAfter = await web3.eth.getBalance(accounts[0])

      assert.strictEqual(balanceBefore.minus(balanceAfter) - txCost, -100)
    });

    it('withdraw ether: should only allow users to withdraw ether they have', async () => {
      await exchange.sellTokens(token.address, 100, 1, {from: accounts[0]})

      const balanceBefore = await web3.eth.getBalance(accounts[0])
      const exchangeBalance = await web3.eth.getBalance(exchange.address)
      const balanceInContract = await exchange.getEtherBalance.call(accounts[0])
      const tx = await exchange.withdrawEther({from: accounts[0]})
      const txCost = 100000000000 * tx.receipt.gasUsed // 100000000000 is the default gasPrice used by truffle
      const balanceAfter = await web3.eth.getBalance(accounts[0])

      assert.strictEqual(balanceBefore.minus(balanceAfter) - txCost, 0)
    });

    it('withdraw ether: should not allow users to double withdraw ether', async () => {
      await exchange.sellTokens(token.address, 100, 1, {from: accounts[0]})
      await exchange.buyTokens(accounts[0], token.address, 100, {from: accounts[1], value: 100})

      const balanceBefore = await web3.eth.getBalance(accounts[0])
      const exchangeBalance = await web3.eth.getBalance(exchange.address)
      const balanceInContract = await exchange.getEtherBalance.call(accounts[0])
      let tx = await exchange.withdrawEther({from: accounts[0]})
      let txCost = 100000000000 * tx.receipt.gasUsed // 100000000000 is the default gasPrice used by truffle
      const balanceAfter = await web3.eth.getBalance(accounts[0])

      assert.strictEqual(balanceBefore.minus(balanceAfter) - txCost, -100)

      tx = await exchange.withdrawEther({from: accounts[0]})
      txCost = 100000000000 * tx.receipt.gasUsed // 100000000000 is the default gasPrice used by truffle
      const balanceAfterSecondWithdraw = await web3.eth.getBalance(accounts[0])
      assert.strictEqual(balanceAfter.minus(balanceAfterSecondWithdraw).toNumber(), txCost)
    });

    it
  })

  // allows a user to create a sell order after depositing

  // does not allow a user to create a sell order without enough tokens

  // allows someone to buy from a user with a sell order

  // does not allow someone to buy from a seller who isn't selling

  // withdrawling:

    // allows a user who deposited to withdraw

    // does not allow a user who didn't deposit to withdraw

    // allows a user who had someone buy from them withdraw ether

    // does not allow someone without ether to withdraw
})
