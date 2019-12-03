pragma solidity ^0.5.0;

import '@openzeppelin/contracts/ownership/Ownable.sol';
import '@openzeppelin/contracts/lifecycle/Pausable.sol';

contract UserRole is Ownable, Pausable  {

    mapping(address => bytes32) public users;

    event UserUpdated(address indexed user, bytes32 id);
    event UserRemoved(address indexed user);

    function updateUser(bytes32 _id)
        public
        whenNotPaused
        returns (bool) {
        require(_id[0] != 0, 'Invalid id');
        emit UserUpdated(msg.sender, _id);
        users[msg.sender] = _id;
        return true;
    }

    function removeUser(address _user)
        public
        returns (bool) {
        require(address(0x0) != _user, 'Invalid address');
        require(isOwner() || _user == msg.sender, 'Not authorised');
        emit UserRemoved(_user);
        users[_user] = '';
        return true;
    }
}