import { Alert, Row, Col, Button, notification, Tabs, Tag, Spin, Collapse } from 'antd';
import { SettingOutlined, CloudUploadOutlined, DownloadOutlined, DeleteOutlined, UploadOutlined } from '@ant-design/icons';
import SHA256 from 'crypto-js/sha256';
import JSZip from 'jszip';
import React from 'react';
import forge from 'node-forge';
import { Animated } from 'react-animated-css';
import Dropzone from 'react-dropzone';
import Web3 from 'web3';
import { abi, COLOR, REQUIRED_SECTION_MARK } from '../../constants';
import { downloadFile } from '../../libs/download';
import {
  revokeCertificate,
} from '../../libs/smartContractUtils';
import { createMT } from '../../libs/verifymt';
import IssuingBatchInfoModalForm from '../ModalForm/ModalForm';
import RevokeForm from '../RevokeForm/RevokeForm';
import './Issue.css';
import Pdf from '../Pdf/Pdf';

const { TabPane } = Tabs;
const openNotificationWithIcon = (type, message, description) => {
  notification[type]({
    message,
    description,
    duration: type === 'success' ? 6 : 15,
  });
};

interface Props {
  MyContract: any;
  contractAddress: string;
  account: string;
  getContractAddressList: string[];
  transactionHash: string;
  createContract: (
    MTRoot,
    instituteName
  ) => void;
}

interface IState {
  hashedCertArray: string[];
  waitingForFileUpload: boolean;
  fileNames: string[];
  fileList: any;
  proofs: any;
  disableButton: boolean;
  MTRoot: string;
  selectedAddress: string;
  reason: string;
  createdContractAddress: string[];
  sectionName: string;
  issuerSetting: any;
  issuerCertCommonName: string;
  hasIssuerSettingInfo: boolean;
  issuerSettingInfoMessage: string;
  issuerSettingInfoType: 'success' | 'info' | 'warning' | 'error'
  hasUploadedFileInfo: boolean;
  uploadedFileInfoMessage: string;
  uploadedFileInfoType: 'success' | 'info' | 'warning' | 'error';
  sections: ISection[];
  receipt: any;
  mandatorySection: any;
  revocationStep: number;
  disableRevocationButton: boolean;
  revokeFileName: string;
  revokingCert: any;
  revokingCertHash: string;
  credentialID: string;
}

interface ISection {
  index: number,
  name: string,
  proof: any[],
  mandatory: any,
  hash: any
}



class Issue extends React.Component<Props, IState> {
  showIssuerSettingAlert = (type, message) => {
    this.setState({ hasIssuerSettingInfo: true, issuerSettingInfoType: type, issuerSettingInfoMessage: message });
  }

  showUploadedFileAlert = (type, message) => {
    this.setState({ hasUploadedFileInfo: true, uploadedFileInfoType: type, uploadedFileInfoMessage: message });
  }

  closeUploadedFileAlert = () => {
    this.setState({ hasUploadedFileInfo: false })
  }

  static readUploadedFileAsText = (inputFile: any) => {
    const temporaryFileReader = new FileReader();

    return new Promise((resolve, reject) => {
      temporaryFileReader.onerror = () => {
        temporaryFileReader.abort();
        reject(new DOMException('Problem parsing input file.'));
      };

      temporaryFileReader.onload = () => {
        resolve(temporaryFileReader.result as any);
      };
      temporaryFileReader.readAsText(inputFile);
    });
  };
  private modal: any;

  constructor(props) {
    super(props);
    this.state = {
      hashedCertArray: [],
      waitingForFileUpload: false,
      fileNames: [],
      fileList: [],
      proofs: [],
      disableButton: true,
      MTRoot: '',
      selectedAddress: '',
      reason: '',
      createdContractAddress: [],
      sectionName: '',
      issuerSetting: undefined,
      issuerCertCommonName: '',

      issuerSettingInfoMessage: '',
      issuerSettingInfoType: 'info',
      hasIssuerSettingInfo: false,

      hasUploadedFileInfo: false,
      uploadedFileInfoMessage: '',
      uploadedFileInfoType: 'info',

      sections: [],
      receipt: undefined,
      mandatorySection: undefined,
      revocationStep: 1,
      disableRevocationButton: true,
      revokeFileName: '',
      revokingCert: undefined,
      revokingCertHash: '',
      credentialID: ''
    };
    this.modal = React.createRef();
  }

  //TODO:
  uploadIssuerSetting = async (files: any) => {
    try {
      let fileContent = await Issue.readUploadedFileAsText(files[0]);

      const setting = JSON.parse(fileContent as string);
      // check json format

      if (!(setting.hasOwnProperty('ethereumAccount')
        && setting.hasOwnProperty('ethereumAccountSignature')
        && setting.hasOwnProperty('issuerCertificateChain'))) {
        this.showIssuerSettingAlert(
          'error',
          'Invalid format for a issuer\'s setting.'
        );
      } else {
        const cert = forge.pki.certificateFromPem(setting.issuerCertificateChain);
        const issuerCN = cert.subject?.getField('CN')?.value;
        this.setState({ issuerSetting: setting, issuerCertCommonName: issuerCN });

        const issuerAccount = setting.ethereumAccount;
        const { account } = this.props;
        if (issuerAccount.toUpperCase() !== account.toUpperCase()) {
          this.showIssuerSettingAlert(
            'warning',
            'Got a valid issuer setting. But the Ethereum account does not match with the connected account in Metamask')
            ;
        }
        else {
          this.showIssuerSettingAlert(
            'success',
            'Got a valid issuer setting'
          )
        }
      };

    } catch (error) {
      this.showIssuerSettingAlert(
        'error',
        'Invalid issuer setting.\n' +
        error
      );
    }
  }

  uploadFile = async (files: any[]) => {
    this.closeUploadedFileAlert();
    const verifyFileFormat = (filename: string) => {
      const filenameParts = filename.split('_');
      if (filenameParts.length !== 2) {
        return false;
      }
      return true;

    };

    const fileList = files;

    // Validate file name format
    const validFileNames = files.filter(file => !verifyFileFormat(file.name));
    if (validFileNames.length > 0) {
      this.showUploadedFileAlert('error',
        'Invalid filename format.'
      );
      return false;
    }

    const fileNamesArray: string[] = [];
    this.setState({ waitingForFileUpload: true, hashedCertArray: [], fileList });
    for (let i = 0; i < fileList.length; i++) {
      // TODO: read student ID from json
      // TODO: Define and check file format
      // take file name for student ID. Ex: ITITIU14076
      fileNamesArray.push(fileList[i].name);
    }

    this.setState({
      fileNames: fileNamesArray,
    });


    // Uploads will push to the file input's `.files` array. Get the last uploaded file.
    // Hash files and store the results
    for (let i = 0; i < fileList.length; i++) {
      try {
        const fileContent = await Issue.readUploadedFileAsText(fileList[i]);
        //TODO: concatenate ID of the credential (Unique for each credential) and hash
        const isMandatory = fileList[i].name.indexOf(REQUIRED_SECTION_MARK) > -1;
        const credentialId = fileList[i].name.split("_")[0];
        
        const componentValue =(credentialId + isMandatory + (fileContent as string));
        const hashOfComponent = '0x' + SHA256(componentValue).toString();

        const modifiedhashedCertArray = this.state.hashedCertArray;
        modifiedhashedCertArray.push(hashOfComponent);

        this.setState({
          hashedCertArray: modifiedhashedCertArray,
        });
      } catch (e) {
        console.log(e);
        this.setState({
          waitingForFileUpload: false,
        });
      }
    }

    console.time("MerkleTree");

    // Build a merkle tree for all certs
    const data = createMT(this.state.hashedCertArray);

    console.timeEnd("MerkleTree");

    const { MTRoot, proofs } = data;
    this.setState({
      proofs,
      disableButton: false,
      MTRoot,
    });

    this.setState({
      waitingForFileUpload: false,
    });

    this.modal.current.showModal();

  };
  getProof = (filename) => {
    const indexOfFile = this.state.fileNames.indexOf(filename);
    //lấy index của filename trên array fileNames
    //dùng index đó để lấy trên array proofs
    return this.state.proofs[indexOfFile];
  }

  getFile = (filename) => {
    const indexOfFile = this.state.fileNames.indexOf(filename);
    return this.state.fileList[indexOfFile];
  }

  // Get hash value from the computed hashedArray
  getHash = (filename) => {
    const indexOfFile = this.state.fileNames.indexOf(filename)
    return this.state.hashedCertArray[indexOfFile];
  }

  createContractTrigger = (values: any) => {
    const { MTRoot } = this.state;
    const { instituteName} = values;
    //ToDo: create state => copy value
    //TODO: await has no effect. Because: ??
    
    this.props.createContract(
      MTRoot,
      '0x'+SHA256(instituteName)
    );
  };

  generateReceipt = () => {
    const { contractAddress } = this.props;
    const { fileNames, issuerSetting } = this.state;
    const zip = new JSZip();



    // 0. Dictionary array {}, mỗi credential_id có 1 list files
    let dic = {};

    // 1. Group file theo credentialID
    // forEach fileNames{
    //     split.filename(_)
    //     if (student nằm trong dictionary) {
    //       đưa file vào list
    //     }
    //     else tạo list mới gồm một phần tử là fileName
    // }
    for (let i = 0; i < fileNames.length; i++) {
      let result = fileNames[i].split('_');
      if (result[0] in dic) {
        dic[result[0]].push(result[1]);
      }
      else {
        dic[result[0]] = [result[1]]
      }
    }
    console.log(dic);
    // 2. forEach Group, kiểm tra các phần tử đúng format không, tạo receipt
    for (var credentialID in dic) {
      const folder = zip.folder(credentialID);
      let studentReceipt =
      {
        version: 0.2,
        issuedOn: new Date(),
        transactionHash: this.props.transactionHash,
        contractAddress,
        credentialID,
        sections: [] as ISection[],
        issuer: issuerSetting
      };


      for (let i = 0; i < dic[credentialID].length; i++) {
        const fullFileName = credentialID + "_" + dic[credentialID][i];
        const sectionName = dic[credentialID][i].split('.')[0];
        const isMandatory = fullFileName.indexOf(REQUIRED_SECTION_MARK) > -1;

        studentReceipt.sections.push({
          index: studentReceipt.sections.length + 1,
          name: sectionName,
          mandatory: isMandatory,
          proof: this.getProof(fullFileName),
          hash: this.getHash(fullFileName)
        });

        const file = this.getFile(fullFileName);
        if (folder != null) { folder.file(fullFileName, file) };
      }

      const receipt = new Blob([JSON.stringify(studentReceipt)], {
        type: 'json',
      });

      if (folder != null) {
        folder.file(
          `${credentialID}_blockchainReceipt.json`,
          receipt,
        );

      }
    }
    zip.generateAsync({ type: 'blob' }).then((content: any) => {
      downloadFile(content, 'certBatch.zip', 'zip');
    });
  };

  receiptDrop = async (files) => {
    if (files.length > 0) {
      let fileContent = await Issue.readUploadedFileAsText(files[0]) as string;
      let receipt = JSON.parse(fileContent as string);
      const credentialID = receipt.credentialID;
      const revokeFileName = files[0].name.split('.')[0];
      const mandatorySection =
        receipt.sections.filter(section => section.mandatory === true);
      console.log(mandatorySection)
      this.setState({
        receipt: receipt,
        mandatorySection: mandatorySection[0],
        revocationStep: 2,
        revokeFileName,
        credentialID
      });
    }
  }

  dropRevokingCert = async files => {
    this.setState({ waitingForFileUpload: true });
    const revokingCert = files[0];
    const certContent = await Issue.readUploadedFileAsText(revokingCert);
    const credentialID = this.state.credentialID;
    //TODO: add credentialID
    const revokingCertHash = '0x'+SHA256(credentialID + true + (certContent as string));
    this.setState({
      revokingCert,
      revokingCertHash,
      waitingForFileUpload: false,
      revocationStep: 3,
      disableRevocationButton: false,
    });
  }

  uploadForRevoking = async () => {
    this.setState({waitingForFileUpload: true});

    const selectedAddress = this.state.receipt.contractAddress;
    const hashedCert = this.state.mandatorySection.hash;
    const revokingHash = this.state.revokingCertHash;
    const { account } = this.props;
    const { reason } = this.state;
    const web3 = new Web3(Web3.givenProvider || 'http://localhost:8545');
    const MyContract = new web3.eth.Contract(abi, selectedAddress);
    if (hashedCert === revokingHash) {
      try {
      await revokeCertificate(
        hashedCert,
        reason,
        account,
        MyContract,
        selectedAddress,
      );
      openNotificationWithIcon(
        'success',
        'Success!',
        <p>
          The certificate has been revoked successfully!
        </p>,
      );
      }
      catch (error) {
        console.error(error);
        this.setState({waitingForFileUpload: false});
        openNotificationWithIcon(
          'error',
          'Cannot submit the transaction',
          <p>
            Please check the transaction log in Metamask.
          </p>,
        );
      }
    } else {
      openNotificationWithIcon(
        'error',
        'Invalid receipt or Digital Certificate',
        <p>
          Please check the receipt and corresponding certificate again.
        </p>,
      );
    }
    this.setState({waitingForFileUpload: false});
  };

  render() {
    const uploadedFileDescription = `Supported filename format:
    CredentialID_SectionName[${REQUIRED_SECTION_MARK}].(pdf|docx)`;
    const { disableButton, receipt, mandatorySection, revocationStep, disableRevocationButton, revokeFileName } = this.state;
    const { Panel } = Collapse;

    const { hasIssuerSettingInfo, issuerSettingInfoMessage, issuerSettingInfoType } = this.state;
    const { hasUploadedFileInfo, uploadedFileInfoMessage, uploadedFileInfoType } = this.state;

    const { contractAddress } = this.props;

    const toDisableCertDropzone = !(issuerSettingInfoType === 'success');
    const toDisableButton = !contractAddress || disableButton || toDisableCertDropzone;

    return (
      <div style={{ display: 'grid' }}>
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ color: '#1890ff' }}>Issuing section</h1>
        </div>

        <Tabs
          defaultActiveKey="1"
          tabBarStyle={{ display: 'flex', justifyContent: 'flex-start' }}
        >
          <TabPane
            tab={
              <span>
                <CloudUploadOutlined
                  style={{ display: 'inline-block', verticalAlign: 'middle' }}
                />
                Issue certificates
              </span>
            }
            key="1"
          >
            <Spin spinning={this.state.waitingForFileUpload} size="large">
              <Row>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'column',
                      width: '100%',
                    }}
                  >
                    <Dropzone
                      onDrop={this.uploadIssuerSetting}
                      accept=".json"
                      className="dropzone"
                    >
                      <Animated
                        animationIn="wobble"
                        animationOut={'none' as any}
                        isVisible
                      >
                        <SettingOutlined
                          style={{
                            fontSize: '70px',
                            color: COLOR.yellow,
                            cursor: 'pointer',
                            marginBottom: '20px',
                          }}
                          className="App-intro"
                        />
                      </Animated>
                      <p>
                        Drop your{' '}
                        <span style={{ fontWeight: 'bold', color: COLOR.blue }}>
                          issuer's setting
                        </span>{' '}
                        here or click to select
                      </p>
                    </Dropzone>
                    {hasIssuerSettingInfo && <Alert message={issuerSettingInfoMessage} type={issuerSettingInfoType} />}
                  </div>
                </Col>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'column',
                      width: '100%',
                      visibility: (toDisableCertDropzone ? 'hidden' : 'visible')
                    }}
                  >
                    <Dropzone
                      onDrop={this.uploadFile}
                      accept=".pdf,.doc,.docs,images/*"
                      multiple
                      className="dropzone"
                    >
                      <Animated
                        animationIn="wobble"
                        animationOut={'none' as any}
                        isVisible
                      >
                        <CloudUploadOutlined
                          style={{
                            fontSize: '70px',
                            color: COLOR.yellow,
                            cursor: 'pointer',
                            marginBottom: '20px',
                          }}
                          className="App-intro"
                        />
                      </Animated>
                      <p>
                        Drop your{' '}
                        <span style={{ fontWeight: 'bold', color: COLOR.blue }}>
                          certificates
                        </span>{' '}
                        here or click to select
                      </p>
                    </Dropzone>
                    <Tag color="blue" style={{ marginBottom: '50px' }}>
                      {this.state.fileNames.length} file(s) selected
                    </Tag>
                    {hasUploadedFileInfo &&
                      <Alert
                        message={uploadedFileInfoMessage}
                        type={uploadedFileInfoType}
                        description={uploadedFileDescription}
                        banner />}
                  </div>
                </Col>
              </Row>
              <Row>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    width: '100%',
                  }}
                  className="App"
                >
                  <Button
                    size="large"
                    type="primary"
                    disabled={toDisableButton}
                    block
                    onClick={() => {
                      this.generateReceipt();
                    }}
                  >
                    <DownloadOutlined
                      style={{ display: 'inline-block', verticalAlign: 'middle' }}
                    />
                    Download blockchain receipt
                  </Button>

                  <IssuingBatchInfoModalForm
                    ref={this.modal}
                    createContractTrigger={this.createContractTrigger}
                    issuerName={this.state.issuerCertCommonName}
                  />
                </div>
              </Row>
            </Spin>
            {/* {this.state.waitingForFileUpload && <span>Uploading file...</span>} */}
          </TabPane>
          <TabPane
            tab={
              <span>
                <DeleteOutlined
                  style={{ display: 'inline-block', verticalAlign: 'middle' }}
                />
                Revoke
              </span>
            }
            key="2"
          >
            <Spin spinning={this.state.waitingForFileUpload} size="large">
              <Row>
                <Col span={12}>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'column',
                      width: '100%',
                    }}
                  >
                    <Dropzone
                      onDrop={this.receiptDrop}
                      accept=".json"
                      className="dropzone"
                    >
                      <Animated
                        animationIn="wobble"
                        animationOut={'none' as any}
                        isVisible
                      >
                        <SettingOutlined
                          style={{
                            fontSize: '70px',
                            color: COLOR.yellow,
                            cursor: 'pointer',
                            marginBottom: '20px',
                          }}
                          className="App-intro"
                        />
                      </Animated>
                      <p>
                        Drop{' '}
                        <span style={{ fontWeight: 'bold', color: COLOR.blue }}>
                          the student blockchain receipt
                        </span>{' '}
                        here or click to select
                      </p>
                    </Dropzone>
                    {revocationStep >= 2 &&
                      <Tag color="blue" style={{ marginBottom: '50px' }}>
                        {revokeFileName} is selected to be revoked.
                      </Tag>
                    }
                  </div>
                </Col>

                {revocationStep >= 2 &&
                  <Col>
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        flexDirection: 'column',
                        width: '100%',
                      }}
                    >
                      <Dropzone
                        onDrop={this.dropRevokingCert}
                        accept=".pdf"
                        className="dropzone"
                      >
                        <Animated
                          animationIn="wobble"
                          animationOut={'none' as any}
                          isVisible
                        >
                          <SettingOutlined
                            style={{
                              fontSize: '70px',
                              color: COLOR.yellow,
                              cursor: 'pointer',
                              marginBottom: '20px',
                            }}
                            className="App-intro"
                          />
                        </Animated>
                        <p>
                          Drop the{' '}
                          <span style={{ fontWeight: 'bold', color: COLOR.blue }}>
                            certificate to be revoked
                          </span>{' '}
                          here or click to select
                        </p>
                      </Dropzone>
                      {this.state.revokingCert &&
                        <Tag color="blue" style={{ marginBottom: '50px' }}>
                          {this.state.revokingCert.name} is selected to be revoked.
                        </Tag>
                      }
                    </div>
                  </Col>

                }
              </Row>
              {revocationStep >= 2 && <Row>
                <div style={{ marginBottom: '10px' }}>
                  <Collapse accordion>
                    <Panel header="Receipt Information" key="Revoke_receiptInfo">
                      <p>Issued Day: </p>
                      <p>{receipt.issuedOn}</p>
                      <p>Contract Address:</p>
                      <p>{receipt.contractAddress}</p>
                      <p>Mandatory Field Hash: </p>
                      <p>{mandatorySection.hash}</p>
                    </Panel>
                  </Collapse>
                </div>
              </Row>}
              {revocationStep === 3 &&
                <Row>
                  <div style={{ marginBottom: '10px' }}>
                    <Collapse accordion>
                      <Panel header="Digital Certificate" key="Revoke_cert">
                        <Pdf file={this.state.revokingCert} />
                      </Panel>
                    </Collapse>,
                  </div>
                </Row>}
              {revocationStep >= 3 &&
                <Row>
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center',
                      flexDirection: 'column',
                      width: '100%',
                    }}
                    className="App"
                  >
                    <RevokeForm
                      onChange={(reason) => {
                        this.setState({
                          reason
                        });
                      }}
                    />
                  </div>
                </Row>}
              <Row>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                    width: '100%',
                    marginBottom: '10px'
                  }}
                  className="App"
                >
                  <Button
                    size="large"
                    type="primary"
                    disabled={disableRevocationButton}
                    block
                    onClick={() => {
                      this.uploadForRevoking();
                    }}
                  >
                    <UploadOutlined
                      style={{ display: 'inline-block', verticalAlign: 'middle' }}
                    />
                    Revoke the certificate.
                  </Button>
                </div>
              </Row>
            </Spin>
          </TabPane>
        </Tabs>
      </div>
    );
  }
}

export default Issue;

