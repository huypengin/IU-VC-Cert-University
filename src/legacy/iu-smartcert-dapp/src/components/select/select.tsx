import React, { Component } from 'react';
import { SafetyCertificateOutlined } from '@ant-design/icons';
import { Row, Tag, Select, Button, notification } from 'antd';
import { Animated } from 'react-animated-css';
import Dropzone from 'react-dropzone';
import './select.css';
import { downloadFile } from '../../libs/download';
import { COLOR } from '../../constants';

const { Option } = Select;


interface ISection {
    id: number,
    name: string,
    proof: any[],
    mandatory: boolean
}

interface IState {
    sections: ISection[],
    selectedSectionIds: number[],
    receipt: any
}

const openNotificationWithIcon = (type, message, description) => {
    notification[type]({
        message,
        description,
        duration: type === 'success' ? 6 : 15,
    });
};

class SelectAAA extends Component<any, IState> {
    private dropzone: any;
    constructor(props) {
        super(props);
        this.dropzone = React.createRef();
    }



    state = {
        sections: [] as ISection[],
        selectedSectionIds: [] as number[],
        receipt: null as any
    }

    inputFile: any;

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

    onUpload = () => {
        this.inputFile.click();
    }

    onDrop = async (files) => {
        if (files.length > 0) {
            let fileContent = await SelectAAA.readUploadedFileAsText(files[0]) as string;
            let receipt = JSON.parse(fileContent as string);
            const optionalSections =
                receipt.sections?.filter(section => section.mandatory === false);

            if (optionalSections) {
                this.setState({
                    sections: optionalSections,
                    receipt,
                    selectedSectionIds: []
                });
            }
            else {
                openNotificationWithIcon(
                    'error',
                    'Invalid receipt',
                    'The structure of the receipt is incorrect');
            }
        }
    }

    onChangeSelect = sectionSelected => {
        this.setState({ selectedSectionIds: sectionSelected });
    }

    onDownload = () => {
        const sectionSelected = this.state.selectedSectionIds;
        let receipt = this.state.receipt;

        if (receipt != null && sectionSelected.length) {
            console.log(sectionSelected, ' ===> id sectionSelected ');
            const fullSelectedSections = receipt.sections.filter(
                (s: ISection) => {
                    console.log(s);
                    return (sectionSelected.indexOf(s.id) > -1) || s.mandatory === true

                });


            receipt.sections = fullSelectedSections;
            const selectiveReceipt = new Blob([JSON.stringify(receipt)], {
                type: 'json',
            });

            downloadFile(selectiveReceipt, 'SelectiveCert.json', 'json');

        }
    }

    render() {
        const { sections } = this.state;
        //TODO: clear selection
        return (
            <div style={{ display: 'grid' }}>
                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <h1 style={{ color: '#1890ff' }}>Selecting section</h1>
                </div>

                <React.Fragment>
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
                            accept={
                                '.json'
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
                                    receipt
                                </span>{' '} here or click to select
                            </p>
                        </Dropzone>

                    </div>
                    <div className='todoListMain'>
                        {
                            sections.length > 0 &&
                            (<Row>
                                <Tag color="blue" style={{ marginBottom: '20px' }}>
                                    Found {sections.length} optional section(s) in your receipt
                                </Tag>
                            </Row>)
                        }
                        <Row>
                            <span style={{ marginTop: '30px' }}>
                                Select section(s) to disclose
                            </span>
                        </Row>
                        <Select
                            value={this.state.selectedSectionIds}
                            onChange={this.onChangeSelect}
                            style={{ width: 400 }}
                            mode="multiple"
                        >
                            {sections.map((e: any, index) => <Option key={index} value={e.id}>{e.name}</Option>)}
                        </Select>
                        <Button type='primary' onClick={this.onDownload}>Download</Button>
                    </div>
                </React.Fragment>
            </div>
        )
    }
}

export default SelectAAA;

