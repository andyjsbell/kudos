pragma solidity ^0.5.0;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol';
import '@openzeppelin/contracts/GSN/Context.sol';

/**
 * @title KudosToken
 */
contract KudosToken is Context, ERC20, ERC20Detailed {

    /**
     * @dev Constructor that gives _msgSender() all of existing tokens.
     */
    constructor () public ERC20Detailed("KudosToken", "KUD", 18) {
        _mint(_msgSender(), 10000 * (10 ** uint256(decimals())));
    }
}