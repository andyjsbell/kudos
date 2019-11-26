pragma solidity ^0.5.0;

import '@openzeppelin/contracts/access/roles/WhitelistedRole.sol';

contract UserRole is WhitelistedRole {

    constructor() public {
    
    }
}