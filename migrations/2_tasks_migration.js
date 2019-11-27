const Tasks = artifacts.require("Tasks");
const KudosToken = artifacts.require("KudosToken");
const days = 7;

module.exports = async function(deployer) {

  await deployer.deploy(KudosToken);
  let kudosToken = await KudosToken.deployed();
  await deployer.deploy(Tasks, kudosToken.address, days);
};
