import { Layout, Menu, message, Spin } from 'antd';
import { SafetyCertificateOutlined, FileProtectOutlined, LinkOutlined } from '@ant-design/icons';
import React, { Component } from 'react';
import Web3 from 'web3';

import { abi, bytecode } from '../../constants';

import { Intro } from '../Intro/Intro';
import Issue from '../Issue/Issue';
import Select from '../select/select';
import Verify from '../Verify/Verify';
import './App.css';
import Logo from './CertMana-logo.png';

// this returns the provider, or null if it wasn't detected
interface IState {
  web3: any;
  institute: string;
  contractAddress: string;
  MyContract: any;
  currentSection: string;
  intro: boolean;
  pendingContract: boolean;
  account: string;
  chainID: string;
  getContractAddressList: string[];
  transactionHash: string
}

declare global {
  interface Window {
    ethereum: any;
  }
}

const { Header, Content } = Layout;
class App extends Component<{}, IState> {
  state = {
    web3: new Web3(Web3.givenProvider || 'http://localhost:8545'),
    institute: '',
    contractAddress: '',
    MyContract: null,
    currentSection: 'verifier',
    intro: true,
    pendingContract: false,
    account: '',
    chainID: '',
    getContractAddressList: [],
    transactionHash: ''
  };

  onAccountChange = (accounts) => {
    this.setState({ account: accounts[0] });
    console.log(this.state.account);
  }

  //TODO: Note
  async componentDidMount() {
    if (typeof window.ethereum !== 'undefined') {
      // const provider = await detectEthereumProvider();
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainID = await window.ethereum.request({ method: 'eth_chainId' });
      this.setState({ chainID });
      this.onAccountChange(accounts);
      window.ethereum.on('accountsChanged', this.onAccountChange);
      window.ethereum.on('chainChanged', (chainId: string) => {
        this.setState({ chainID: chainId });
        window.location.reload();
      });
    }
  }

  createContract = async (
    MTRoot: string,
    instituteName: string
  ) => {
    const { web3, account } = this.state;
    this.setState({
      pendingContract: true,
    });
    console.log(this.state.institute, MTRoot);
    console.log(
      'im also here',
      MTRoot,
      instituteName,
    );


    const certContract = new web3.eth.Contract(abi);
    try {
      await certContract
        .deploy({
          arguments: [
            instituteName,
            MTRoot,
          ],
          data: bytecode,
        })
        .send({
          from: account,
          // gas: 4700000,
          // gasPrice: '3000000',
        })
        .on('transactionHash', (transactionHash) => {
          this.setState({ transactionHash });
        })
        .on('receipt', (receipt) => {
          console.log("Contract created. Gas used:", receipt.gasUsed);
        })
        .then(async newContractInstance => {
          const MyContract = new web3.eth.Contract(
            abi,
            newContractInstance.options.address,
          );
          this.setState({
            contractAddress: newContractInstance.options.address,
            MyContract,
            pendingContract: false,
          });
          message.success('Smart Contract created');
          console.log('address: ', newContractInstance.options.address);
        });
    } catch (err) {
      console.error(err);
      await message.error(
        {
          content: 'Cannot deploy the Smart Contract. Check transaction logs in Metamask',
          duration: 3,
          className: 'custom-class',
          style: {
            marginTop: '20vh',
          },
        });
      this.setState({ pendingContract: false });
    }

  };


  selectSection = (section: string) => {
    this.setState({
      currentSection: section,
    });
  };

  render() {
    const {
      MyContract,
      contractAddress,
      currentSection,
      intro,
      pendingContract,
      account,
      chainID
    } = this.state;

    return intro ? (
      <Intro
        onClick={chosenSection => {
          this.setState({
            currentSection: chosenSection,
            intro: false,
          });
        }}
      />
    ) : (
      <Spin spinning={pendingContract} tip="Deploying smart contract ...">
        <Layout className="layout" style={{ height: '100vh' }}>
          <Header>
            <div
              className="logo"
              style={{
                background: 'transparent',
                margin: '0 24px 0 0',
              }}
            >
              <img src={Logo} alt="logo" style={{ width: '120px' }} />
            </div>
            <Menu
              theme="dark"
              mode="horizontal"
              defaultSelectedKeys={[currentSection]}
              style={{ lineHeight: '64px' }}
            >
              <Menu.Item
                key="verifier"
                onClick={() => this.selectSection('verifier')}
              >
                <SafetyCertificateOutlined
                  style={{ display: 'inline-block', verticalAlign: 'middle' }} />
                Verifier

              </Menu.Item>
              <Menu.Item
                key="issuer"
                onClick={() => this.selectSection('issuer')}
              >
                <FileProtectOutlined
                  style={{ display: 'inline-block', verticalAlign: 'middle' }}
                />
                Issuer
              </Menu.Item>
              <Menu.Item
                key="select"
                onClick={() => this.selectSection('select')}
              >
                <FileProtectOutlined
                  style={{ display: 'inline-block', verticalAlign: 'middle' }}
                />
                Owner
              </Menu.Item>
              <Menu.Item
                key="connect"
                disabled={account.length !== 0}                
              >
                <LinkOutlined />
                <span style={{ color: 'white' }}>Connected to: {account}</span>
                <span style={{ color: 'white' }}> | ChainID: {chainID}</span>
              </Menu.Item>
            </Menu>
          </Header>
          <Content style={{ padding: '0 50px' }} className="App">
            <div style={{ background: '#fff', padding: 24, height: '93vh' }}>
              {currentSection === 'issuer' && account.length !== 0 ? (
                <Issue
                  MyContract={MyContract}
                  contractAddress={contractAddress}
                  account={account}
                  getContractAddressList={this.state.getContractAddressList}
                  transactionHash={this.state.transactionHash}
                  createContract={this.createContract}

                />
              ) :
                (currentSection === 'verifier' ?
                  (
                    <Verify MyContract={MyContract} />
                  )
                  :
                  (currentSection === 'select' ?
                    (<Select />
                    )
                    :
                    (
                      <h2>Metamask not found</h2>
                    )
                  )
                )
              }
            </div>
          </Content>
        </Layout>
      </Spin>
    );
  }
}

export default App;
