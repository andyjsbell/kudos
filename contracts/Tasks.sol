pragma solidity ^0.5.0;
import './KudosToken.sol';

/// @title A list of Tasks
/// @author Andy Bell andy.bell@displaynote.com
/// @notice You can use this contract to create and complete tasks set
contract Tasks {

    struct Task {
        address owner;
        uint tokens;
        address[] hunters;
    }

    event TaskCreated(address indexed creator, uint indexed tokens);
    event TaskCompleted(bytes32 indexed task, address indexed owner, address indexed hunter, uint tokensTransferred);
    event HunterAdded(bytes32 indexed task, address indexed hunter);

    mapping(bytes32 => Task) public tasks;

    KudosToken private kudos;

    /// @author Andy Bell andy.bell@displaynote.com
    /// @notice The Tasks contract
    /// @param _kudos Address to the Kudos token contract
    constructor(KudosToken _kudos) public {
        kudos = _kudos;
    }

    /// @author Andy Bell andy.bell@displaynote.com
    /// @notice Create a task to be completed
    /// @param _id A 32 character hash which would point to decentralised metainfo
    /// @param _tokens A number of Kudos tokens for this task
    /// @return boolean whether we succesfully transfer the tokens for the task
    function createTask(bytes32 _id, uint32 _tokens)
        public
        returns (bool) {
        require(_id[0] != 0, 'Invalid id');
        require(_tokens > 0, 'Send tokens');
        require(tasks[_id].owner == address(0x0), 'Task exists');
        require(kudos.allowance(msg.sender, address(this)) > _tokens, 'Insufficient allowance');

        // Store on chain
        Task memory t;
        t.owner = msg.sender;
        t.tokens = _tokens;
        tasks[_id] = t;

        // Emit the event
        emit TaskCreated(msg.sender, _tokens);

        // Stake tokens
        return kudos.transferFrom(msg.sender, address(this), _tokens);
    }

    /// @author Andy Bell andy.bell@displaynote.com
    /// @notice Add caller as a hunter for the task
    /// @param _id A 32 character hash which would point to the task
    function addHunter(bytes32 _id)
        public {
        require(_id[0] != 0, 'Invalid id');
        require(tasks[_id].owner != address(0x0), 'Task does not exist');

        tasks[_id].hunters.push(msg.sender);
        emit HunterAdded(_id, msg.sender);
    }

    /// @author Andy Bell andy.bell@displaynote.com
    /// @notice Complete a task
    /// @dev Only the owner can complete a task
    /// @param _id A 32 character hash which would point to the task
    /// @param _winner Address of the hunter
    function completeTask(bytes32 _id, address _winner)
        public {
        Task memory t = tasks[_id];
        require(t.owner == msg.sender, 'Invalid task');
        require(_winner != address(0x0), 'Invalid hunter');
        require(t.hunters.length > 0, 'No hunters');

        uint len = t.hunters.length;
        address payee = address(0x0);
        for (uint i = 0; i < len; i++) {
            if (_winner == t.hunters[i]) {
                payee = _winner;
                break;
            }
        }
        require(payee != address(0x0), 'Invalid hunter');

        emit TaskCompleted(_id, t.owner, _winner, 0);
    }
}