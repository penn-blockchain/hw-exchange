pragma solidity ^0.4.11;

// ADD: you may need the interface of some contract to interact with it . . .
import "./ERCToken.sol";

contract TokenExchange {
  /*
  *  Data structures
  */

  struct SellOrder {
    uint numTokens;
    uint pricePerToken;
  }

  // Can be a seller or a buyer!
  struct User {
    mapping (address => uint) tokenBalance;
    // ADD: mapping for keeping track of the sell orders for some token the user may be selling
    mapping (address => SellOrder) sellOrders;
    // ADD: variable for keeping track of a users balance in Ether (from tokens they have sold)
    uint etherBalance;
  }

  mapping (address => User) users;


  //@dev Allows anyone to transfer previously-approved tokens to this exchange.
	//@param _token Token address where approve(exchangeAddress, _amount) was called
	//@param _amount Amount of tokens being deposited, that have already been approved in the token contract
  function depositToken(address _token, uint _amount) public {
    // HINT 1: make sure you are calling transferFrom on the token contract and checking the result.
    // HINT 2: don't forget to cast the _token address to a variable you can call functions on . . .
    // HINT 3: check out the FAQ for info about casting (and if you are confused about this function).
    ERCToken(_token).transferFrom(msg.sender, this, _amount);
    users[msg.sender].tokenBalance[_token] += _amount;

  }

  //@dev Allows anyone to sell token that they have already deposited in the exchange
  //@param _token The token that has been previous deposited and is going to be sold
  //@param _amount The number of _tokens being sold
  //@param _costPerToken The cost, in Wei, per token being sold
  function sellTokens(address _token, uint _amount, uint _costPerToken) public {
    require(users[msg.sender].tokenBalance[_token] >= _amount);
    users[msg.sender].sellOrders[_token] = SellOrder({numTokens : _amount, pricePerToken: _costPerToken});
  }


  //@dev Allows someone to bu y tokens from an someone who is selling them, for the specified price
  //@param _seller Address of user to buy the tokens from
  //@param _token Address of token to buy
  //@param _amount The number of tokens to purchase.
  function buyTokens(address _seller, address _token, uint _amount) public payable {
    require(users[_seller].sellOrders[_token].numTokens >= _amount);
    require(msg.value >= _amount * users[_seller].sellOrders[_token].pricePerToken);

    users[_seller].tokenBalance[_token] -= _amount;
    users[_seller].sellOrders[_token].numTokens -= _amount;
    users[_seller].etherBalance += _amount * users[_seller].sellOrders[_token].pricePerToken;

    msg.sender.transfer(msg.value - _amount * users[_seller].sellOrders[_token].pricePerToken);

    users[msg.sender].tokenBalance[_token] += _amount;
  }

  //@dev Allows anyone to withdraw tokens this exchange holds on their behalf
	//@param _token Address of token being withdrawn
	//@param _amount Amount of tokens being withdrawn
  function withdrawToken(address _token, uint _amount) public {
    require(users[msg.sender].tokenBalance[_token] >= _amount);

    users[msg.sender].tokenBalance[_token] -= _amount;
    delete users[msg.sender].sellOrders[_token];

    ERCToken(_token).transfer(msg.sender, _amount);
  }

  //@dev Allows anyone to withdraw any Ether held by this exchange on their behalf
  function withdrawEther() public {
    msg.sender.transfer(users[msg.sender].etherBalance);
    users[msg.sender].etherBalance = 0;
  }


  /*
  *   Read functions
  */

  //Allows anyone to check a token balance of a specific user on the exchange.
	//@param _owner Address of user to check balance of.
	//@param _token Address of token to check balance of _owner for.
	//@return Returns amount of _token held by the exchange on behalf of the _owner.
  function getTokenBalance(address _owner, address _token) public view returns (uint balance) {
      return users[_owner].tokenBalance[_token];
  }

  //Allows anyone to check the ether balance of someone on this exchange.
	//@param _owner Address of user to check balance of.
	//@return Returns amount of ether held by this exchange on behalf of the user
  function getEtherBalance(address _owner) public view returns (uint balance) {
      return users[_owner].etherBalance;
  }

}
