pragma solidity ^0.5.0;

contract UserRole {

    mapping(address => bytes32) public users;

    constructor() public {
    }

    function updateUser(bytes32 _id)
        public
        returns (bool) {
        require(_id[0] != 0, 'Invalid id');
        users[msg.sender] = _id;
        return true;
    }
}