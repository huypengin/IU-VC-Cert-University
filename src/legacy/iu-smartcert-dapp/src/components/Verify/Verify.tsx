import { Button, List, notification, Popconfirm, Steps, Tag } from 'antd';
import { ScanOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import SHA256 from 'crypto-js/sha256';
import Lottie from 'lottie-react-web';
import React from 'react';
import { Animated } from 'react-animated-css';
import Dropzone from 'react-dropzone';
import Web3 from 'web3';

import { abi, COLOR } from '../../constants';
import {
  getInstituteInfo,
  //getRoot,
  verifyWithRevocationList,
} from '../../libs/smartContractUtils';
import { verify } from '../../libs/verifymt';
import { verifyPKI } from '../../libs/verifyPKI';

import CustomDrawer from '../Drawer/Drawer';
import { firework } from './firework';
import './Verify.css';

const openNotificationWithIcon = (type, message, description) => {
  notification[type]({
    message,
    description,
    duration: type === 'success' ? 6 : 15,
  });
};

const descriptionStep = data => (
  <List
    size="small"
    dataSource={data}
    renderItem={item => <List.Item> {item} </List.Item>}
  />
);

const { Step } = Steps;


const initialState = {
  receipt: {},
  hashedCert: '',
  waitingForFileUpload: false,
  web3: new Web3(Web3.givenProvider || 'http://localhost:8545'),
  fileType: 'receipt',
  currentFileType: 'blockchain receipt',
  steps: [
    {
      message: 'Load blockchain receipt',
      status: 'process',
      description: descriptionStep([
        '1. Load the blockchain receipt',
        '2. Verify the smart contract address signature',
        '3. Call the smart contract with the address attached in the receipt',
        '4. Get the information from that smart contract',
      ]),
    },
    {
      message: 'Load digital certificate',
      status: 'wait',
      description: descriptionStep([
        '1. Load the digital certificate',
        '2. Hash the content of the certififcate',
      ]),
    },
    {
      message: 'Verify with Smart Contract',
      status: 'wait',
      description: descriptionStep([
        '1. Call the smart contract with the address embedded in the receipt',
        '2. Compare the Merkle Tree Root in the smart contract with the calculated one using proof and leaf data in the receipt',
      ]),
    },
    {
      message: 'Verify with Revocation List',
      status: 'wait',
      description: descriptionStep([
        '1. Check the existence of the hashed content of the certificate in revocation list in smart contract',
      ]),
    },
    { message: 'Done', status: 'wait' },
  ],
  currentStep: 0,
  renderFireWork: false,
  instituteInfo: {},
  certFile: [],
  sectionHash: [],
  hashedUploadFileArray: [],
  sections: [],
  corresspondingSections: [],
  issuedDate: undefined,
  credentialID: ''
};

interface ISection {
  id: number,
  name: string,
  proof: any[],
  mandatory: any,
  hash: any
}

interface IState {
  receipt: any;
  hashedCert: string;
  waitingForFileUpload: boolean;
  web3: any;
  fileType: string;
  currentFileType: string;
  steps: any;
  currentStep: number;
  renderFireWork: boolean;
  instituteInfo: object;
  issuedDate: Date | undefined
  certFile: any[];
  sectionHash: any[];
  hashedUploadFileArray: any[];
  sections: ISection[];
  corresspondingSections: any[];
  credentialID: string;
}

interface Props {
  MyContract: any;
}

class Verify extends React.Component<Props, IState> {
  static readUploadedFileAsText = inputFile => {
    const temporaryFileReader = new FileReader();

    return new Promise((resolve, reject) => {
      temporaryFileReader.onerror = () => {
        temporaryFileReader.abort();
        reject(new DOMException('Problem parsing input file.'));
      };

      temporaryFileReader.onload = () => {
        resolve(temporaryFileReader.result as {});
      };
      temporaryFileReader.readAsText(inputFile);
    });
  };

  private drawer: any;
  private dropzone: any;
  constructor(props) {
    super(props);
    this.drawer = React.createRef();
    this.dropzone = React.createRef();
    this.state = {
      ...initialState,
    };
  }

  onDrop = file => {
    if (this.state.fileType === 'receipt') {
      this.uploadReceipt(file);
    } else {
      this.uploadCert(file);
    }
  };

  onCancel = () => {
    // this.setState({
    //   files: [],
    // });
  };

  checkMandatory = (receiptObject) => {
    const { sections } = receiptObject;
    const mandatoryObject = sections.filter(e => e.mandatory === true)
    if (mandatoryObject.length === 0) {
      return false;
    }
    else {
      return true;
    }
  }

  uploadReceipt = async files => {
    this.setState({ waitingForFileUpload: true });
    const receiptFile = files[0];
    let receiptContents;

    // Uploads will push to the file input's `.files` array. Get the last uploaded file.

    try {
      receiptContents = await Verify.readUploadedFileAsText(receiptFile);
      this.setState({
        waitingForFileUpload: false,
      });
    } catch (e) {
      console.log(e);
      this.setState({
        waitingForFileUpload: false,
      });
    }

    // STEP 0: Got the receipt
    const receiptObject = JSON.parse(receiptContents);
    const { sections } = receiptObject;
    
    const sectionNames = [] as any[];
    for (let p = 0; p < sections.length; p++) {
      sectionNames.push(sections[p].name)
    }

    const sectionHash = [] as any[];
    for (let p = 0; p < sections.length; p++) {
      sectionHash.push(sections[p].hash)
    }

    const credentialID = receiptObject.credentialID;

    this.setState({ credentialID, sections });

    if (this.checkMandatory(receiptObject) === false) {
      this.setState({
        currentStep: 0,
      });
      this.state.steps[0].status = 'error';
      this.forceUpdate();
      openNotificationWithIcon(
        'error',
        'Invalid receipt',
        <p>
          Invalid receipt. The selective disclosure must include a mandatory section
        </p>,
      );
    }

    else {
      const instituteInfo = await this.getInstituteInfo(receiptObject);
      const issuedDate = await this.getIssuedDate(receiptObject);
      const smartContractOwner = instituteInfo[4];
      this.setState({ instituteInfo });

      const verifyPKIResult = verifyPKI(smartContractOwner, receiptObject);

      if (verifyPKIResult.r === false) {
        this.state.steps[0].status = 'error';
        this.forceUpdate();
        openNotificationWithIcon(
          'error',
          'Invalid receipt',
          <p>
            Invalid receipt. Cannot verify the identify of issuer.
        </p>,
        );
        return false;
      }
      else {
        const issuerCommonName = verifyPKIResult.CommonName;
        const issuerEmail = verifyPKIResult.Email;
        const issuerOrganization = verifyPKIResult.Organization;
        const addInstituteInfo = { 7: issuerCommonName, 8: issuerEmail, 9: issuerOrganization };
        this.setState({
          receipt: receiptObject,
          fileType: 'certificate',
          currentFileType: 'digital certificate',
          instituteInfo: { ...this.state.instituteInfo, ...addInstituteInfo },
          issuedDate
        });

        console.log(instituteInfo)
        if (instituteInfo[0] !== '0x'+SHA256(issuerCommonName).toString()) {
          this.state.steps[0].status = 'error';
          this.forceUpdate();
          openNotificationWithIcon(
            'error',
            'Invalid institude name',
            <p>
              The institude name in your receipt ( {instituteInfo[0]} ) and the name given by trusted authority ( {issuerCommonName} ) are not matched.
            </p>,
          );
        }
        else {
          this.state.steps[1].status = 'process';
          this.forceUpdate();
          this.setState({ currentStep: 1 });
          openNotificationWithIcon(
            'info',
            'Note',
            <div>
              Please upload your <ol>{sectionNames.map(sectionName => (<li key={sectionName}>{sectionName}</li>))} </ol>to begin the verifying process. You can
              either click this Button{' '}
              <Tag
                color="blue"
                onClick={e => {
                  this.dropzone.current.onClick(e);
                  notification.destroy();
                }}
              >
                Upload certificate
              </Tag>
              or drag your file to the dropzone
            </div>,
          );
        }
      }
    }

    this.setState({ sectionHash: sectionHash });
  };

  uploadCert = async files => {
    this.setState({ waitingForFileUpload: true });
    const certFile: [] = files;
    const { credentialID, sections } = this.state;

    const hashedUploadFileArray: any = [];
    try {
      for (let i = 0; i < certFile.length; i++) {
        const certContent = await Verify.readUploadedFileAsText(certFile[i]);
        //TODO: Combine the content with the component type (mandatory or not)
        // Then hash
        // Problem: How to know whether the component is mandatory or optional
        // Idea: generate 2 combinations (0 + content) and (1 + content)
        // hash and try to find it in the receipt
        const hashedCert_mandatory = '0x' + SHA256(credentialID + true + (certContent as string)).toString();
        const hashedCert_optional = '0x' + SHA256(credentialID + false + (certContent as string)).toString();
        hashedUploadFileArray.push(hashedCert_mandatory);
        hashedUploadFileArray.push(hashedCert_optional);
      };
    } catch (e) {
      this.setState({
        waitingForFileUpload: false,
      });
    }

    const sectionsHash = sections.map(section => section.hash)
    let validHashValues = hashedUploadFileArray.filter(hash => sectionsHash.indexOf(hash) !== -1);
    if (validHashValues.length !== sectionsHash.length) {
      this.setState({
        currentStep: 1,
      });
      this.state.steps[1].status = 'error';
      this.forceUpdate();
      openNotificationWithIcon(
        'error',
        'Invalid files',
        <p>
          Please upload the correct files according to the receipt.
        </p>,
      );
    }
    else {
      this.state.steps[2].status = 'process';
      this.setState({
        waitingForFileUpload: false,
        hashedUploadFileArray: validHashValues,
        currentStep: 2,
        certFile
      })
      this.forceUpdate();
    }
  };

  getInstituteInfo = async receiptObject => {
    const { web3 } = this.state;
    const MyContract = new web3.eth.Contract(
      abi,
      receiptObject.contractAddress,
    );
    const instituteInfo = await getInstituteInfo(MyContract);
    return instituteInfo;
  };

  getIssuedDate = async receiptObject => {
    const { web3 } = this.state;
    //TODO
    const transaction = await web3.eth.getTransaction(receiptObject.transactionHash);
    const block = await web3.eth.getBlock(transaction.blockNumber);
    const date = new Date(block.timestamp * 1000);
    return date;
  }

  verifySection = async (section: ISection, MyContract: any) => {
    const verifyWithMT = await verify(
      MyContract,
      section.proof,
      section.hash,
    );
    return verifyWithMT;
  };

  verifyAllSections = async () => {
    const { receipt, sections, web3 } = this.state;
    const contractAddress = receipt.contractAddress;
    const MyContract = new web3.eth.Contract(abi, contractAddress);
    
    for (let i = 0; i < sections.length; i++) {
      let verifyResult = await this.verifySection(sections[i], MyContract);
      console.log(verifyResult);
      if (!verifyResult)
        return false;
    }
    return true;
  };

  verifyCert = async () => {
    const { receipt, web3, sections } = this.state;
    const MyContract = new web3.eth.Contract(abi, receipt.contractAddress);
    //TODO: mandatory
    const mainCertificate = sections.find(section => section.mandatory === true)
    const hashedCert = mainCertificate?.hash;
    console.log(mainCertificate);
    console.log(hashedCert);

    console.log(this.verifyAllSections())
    if (await this.verifyAllSections()) {
      this.setState({
        currentStep: 3,
      });
      this.state.steps[3].status = 'process';
      this.forceUpdate();
      const resultWithRevocation = await verifyWithRevocationList(
        hashedCert,
        MyContract,
      );
      if (resultWithRevocation[0]) {
        this.setState({
          currentStep: 4,
          renderFireWork: true,
        });
        setTimeout(() => {
          this.setState({
            renderFireWork: false,
          });
        }, 1900);
        this.state.steps[4].status = 'finish';
        this.forceUpdate();

        openNotificationWithIcon(
          'success',
          'Congratulations',
          'Your certifiticate is valid without being tampered',
        );
        openNotificationWithIcon(
          'info',
          'Note',
          <div>
            Please check the public key of the institute with qualified CA.
            Please click{' '}
            <Tag color="blue" onClick={() => this.drawer.current.showDrawer()}>
              View info
            </Tag>{' '}
            button for more information
          </div>,
        );
      } else {
        // error revoke
        this.setState({
          currentStep: 3,
        });
        this.state.steps[3].status = 'error';
        this.forceUpdate();
        openNotificationWithIcon(
          'error',
          'Revoked certificate',
          <p>
            The certificate is currently being revoked. Please contact the
            issuer for more information.{' '}
            <b>Revocation reason: {resultWithRevocation[1]}</b>
          </p>,
        );
      }
    } else {
      this.state.steps[2].status = 'error';
      this.forceUpdate();
      openNotificationWithIcon(
        'error',
        'Invalid certificate',
        'The certificate is not valid. Please check again',
      );
    }
  };

  render() {
    const {
      fileType,
      currentFileType,
      currentStep,
      steps,
      instituteInfo,
      issuedDate,
      renderFireWork,
    } = this.state;
    return (
      <div style={{ display: 'grid' }}>
        {renderFireWork && (
          <div className="fireworkContainer">
            <Lottie
              options={{
                animationData: firework,
              }}
            />
          </div>
        )}
        <div
          style={{
            textAlign: 'center',
            marginBottom: '20px',
            flexDirection: 'row',
          }}
        >
          <Popconfirm
            title="Are you sure to restart the verification process?"
            onConfirm={() => {
              this.setState({
                ...initialState,
              });
            }}
            onCancel={() => null}
            okText="Yes"
            cancelText="Cancel"
          >
            <h1>
              <a href=".">Verifying section</a>
            </h1>
          </Popconfirm>
        </div>

        <div
          style={{
            justifyContent: 'center',
            alignItems: 'center',
            display: 'flex',
          }}
        >
          <Dropzone
            ref={this.dropzone}
            onDrop={this.onDrop}
            onFileDialogCancel={this.onCancel}
            accept={
              fileType === 'receipt' ? '.json' : '.pdf,.doc,.docs,images/*'
            }
            className="dropzone"
          >
            <Animated
              animationIn="wobble"
              animationOut={'none' as any}
              isVisible
            >
              <SafetyCertificateOutlined
                style={{
                  fontSize: '70px',
                  color: COLOR.yellow,
                  marginBottom: '20px',
                }}
                className="App-intro"
              />
            </Animated>
            <p>
              Drop your{' '}
              <span style={{ fontWeight: 'bold', color: COLOR.blue }}>
                {currentFileType}
              </span>{' '}
              here or click to select
            </p>
          </Dropzone>
        </div>
        {currentStep === 2 && (
          <Button type="primary" onClick={this.verifyCert}>
            <ScanOutlined
              style={{ display: 'inline-block', verticalAlign: 'middle' }}
            />
            Verify Certificate
          </Button>
        )}
        {currentStep >= 0 && (
          <div>
            <div style={{ textAlign: 'left', margin: '20px 0' }}>
              <Steps
                current={currentStep}
                status={steps[currentStep].status}
                progressDot
              >
                {steps.map(step => (
                  <Step
                    title={step.message}
                    key={step.message}
                    description={step.description}
                  />
                ))}
              </Steps>
            </div>

            {currentStep > 0 && (
              <CustomDrawer
                ref={this.drawer}
                instituteInfo={instituteInfo}
                issuedDate={issuedDate}
                files={this.state.certFile}
              />
            )}
          </div>
        )}

        {this.state.waitingForFileUpload && <span>Uploading file...</span>}
      </div>
    );
  }
}

export default Verify;
