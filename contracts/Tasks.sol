pragma solidity ^0.5.0;
import './KudosToken.sol';

contract Tasks {

    struct Task {
        address owner;
        uint tokens;
    }

    event TaskCreated(address indexed creator, uint indexed tokens);


    mapping(bytes32 => Task) public tasks;
    KudosToken kudos;

    constructor(KudosToken _kudos) public {
        kudos = _kudos;
    }

    function createTask(bytes32 _id, uint32 _tokens)
        public {
        require(_id != "", 'Invalid id');
        require(kudos.balanceOf(msg.sender) >= _tokens, 'Insufficient balance');

        emit TaskCreated(msg.sender, _tokens);
        // Stake the tokens, transfer to this contract, TODO
        tasks[_id] = Task({owner:msg.sender, tokens: _tokens});
    }
}