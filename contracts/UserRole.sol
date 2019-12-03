pragma solidity ^0.5.0;

import '@openzeppelin/contracts/ownership/Ownable.sol';

contract UserRole is Ownable {

    mapping(address => bytes32) public users;

    function updateUser(bytes32 _id)
        public
        returns (bool) {
        require(_id[0] != 0, 'Invalid id');
        users[msg.sender] = _id;
        return true;
    }

    function removeUser(address _user)
        public
        returns (bool) {
        require(address(0x0) != _user, 'Invalid address');
        require(isOwner() || _user == msg.sender, 'Not authorised');
        users[_user] = '';
        return true;
    }
}