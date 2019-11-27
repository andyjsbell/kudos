pragma solidity ^0.5.0;
import './KudosToken.sol';

/// @title A list of Tasks
/// @author Andy Bell andy.bell@displaynote.com
/// @notice You can use this contract to create and complete tasks set
contract Tasks {

    struct Task {
        address owner;
        uint tokens;
        mapping(address=>bool) hunters;
        uint hunterCount;
        uint created;
    }

    event TaskCreated(bytes32 indexed task, address indexed owner, uint tokens);
    event TaskCompleted(bytes32 indexed task, address indexed owner, address indexed hunter, uint tokensTransferred);
    event TaskCancelled(bytes32 indexed task, address indexed owner);
    event HunterAdded(bytes32 indexed task, address indexed hunter);
    event HunterRemoved(bytes32 indexed task, address indexed hunter);
    event TimeoutChanged(uint beforeInDays, uint afterInDays);

    mapping(bytes32 => Task) public tasks;
    uint public timeoutInDays;
    KudosToken private kudos;

    /// @author Andy Bell andy.bell@displaynote.com
    /// @notice The Tasks contract
    /// @param _kudos Address to the Kudos token contract
    /// @param _timeoutInDays Number of days before a task can be cancelled by owner
    constructor(KudosToken _kudos, uint _timeoutInDays) public {
        kudos = _kudos;
        timeoutInDays = _timeoutInDays;
    }

    /// @author Andy Bell andy.bell@displaynote.com
    /// @notice Update timeout
    /// @param _timeoutInDays Timeout in days
    /// @return boolean whether updated
    function setTimeoutInDays(uint _timeoutInDays)
        public
        returns (bool) {
        require(_timeoutInDays < 60, 'More than 60 days');
        emit TimeoutChanged(timeoutInDays, _timeoutInDays);
        timeoutInDays = _timeoutInDays;
        return true;
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
        t.created = block.timestamp;
        tasks[_id] = t;

        // Emit the event
        emit TaskCreated(_id, msg.sender, _tokens);

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
        require(tasks[_id].tokens > 0, 'Task completed');

        tasks[_id].hunters[msg.sender] = true;
        tasks[_id].hunterCount = tasks[_id].hunterCount + 1;
        emit HunterAdded(_id, msg.sender);
    }

    /// @author Andy Bell andy.bell@displaynote.com
    /// @notice Remove caller as a hunter for the task
    /// @param _id A 32 character hash which would point to the task
    function removeHunter(bytes32 _id)
        public {
        require(_id[0] != 0, 'Invalid id');
        require(tasks[_id].owner != address(0x0), 'Task does not exist');
        require(tasks[_id].hunters[msg.sender], 'Hunter does not exist');

        tasks[_id].hunters[msg.sender] = false;
        tasks[_id].hunterCount = tasks[_id].hunterCount - 1;
        emit HunterRemoved(_id, msg.sender);
    }

    /// @author Andy Bell andy.bell@displaynote.com
    /// @notice Complete a task
    /// @dev Only the owner can complete a task
    /// @param _id A 32 character hash which would point to the task
    /// @param _winner Address of the hunter
    function completeTask(bytes32 _id, address _winner)
        public {
        Task storage t = tasks[_id];
        require(t.owner == msg.sender, 'Invalid task');
        require(_winner != address(0x0), 'Invalid hunter');
        require(t.hunters[_winner], 'No hunters');
        require(t.tokens > 0, 'Task completed');

        uint tokensToTransfer = t.tokens;
        tasks[_id].tokens = 0;
        if (kudos.transfer(_winner, tokensToTransfer)) {
            emit TaskCompleted(_id, t.owner, _winner, tokensToTransfer);
        } else {
            // Rewind.  I am thinking if we return false it is a revert which would wind this back anyhow.
            // TODO - check this and remove line below if not needed
            tasks[_id].tokens = tokensToTransfer;
        }
    }

    /// @author Andy Bell andy.bell@displaynote.com
    /// @notice Cancel a task
    /// @dev Only the owner can cancel the task
    /// @param _id A 32 character hash which would point to the task
    function cancelTask(bytes32 _id)
        public {
        require(_id[0] != 0, 'Invalid id');
        require(tasks[_id].owner == msg.sender, 'Invalid task');
        bool expired = tasks[_id].created + (timeoutInDays * 1 days) < block.timestamp;
        require(expired || tasks[_id].hunterCount == 0, 'Unable as still valid');

        // Cancel task
        uint tokensToTransfer = tasks[_id].tokens;
        tasks[_id].tokens = 0;
        emit TaskCancelled(_id, msg.sender);
        kudos.transfer(msg.sender, tokensToTransfer);
    }
}