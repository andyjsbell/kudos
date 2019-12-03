pragma solidity ^0.5.0;

contract UserRole {

    mapping(address => bytes32) public users;

    constructor() public {
    }

    function updateUser(bytes32 id)
        public
        returns (bool) {
        users[msg.sender] = id;
        return true;
    }
}