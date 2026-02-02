import React from 'react';
import { Modal, Form, Input } from 'antd';


const FormItem = Form.Item;


const IssuingBatchForm = ({issuerName, visible, onCancel, onCreate}) => {
  const [form] = Form.useForm();
  return (
    <Modal
      visible={visible}
      title="Input this batch of certificates information"
      okText="Create"
      cancelText="Cancel"
      onCancel={onCancel}
      onOk={() => {
        form
          .validateFields()
          .then(values => {
            form.resetFields();
            onCreate(values);
          })
          .catch(info => {
            console.log('Validated Failed:', info);
          })
      }}
    >
      <Form 
        form={form}
        layout="vertical" 
        name="batch_info"
        initialValues={{
          modifier: 'public',
        }}
      >
          <FormItem
            name="instituteName"
            label="Institute name"
            rules={[
              {
                required: true,
                message: 'Please input the name of the issuing institute!',
              }
            ]
            }>
            <Input defaultValue={"*FIX ME* " + issuerName}/>
          </FormItem>
          <FormItem 
            name="logoUrl"
            label="Logo URL">
            <Input addonBefore="http://" placeholder="url ..." />
          </FormItem>
          <FormItem 
            name="yearOfGraduation"
            label="Year of Graduation">
            <Input type="number" />
          </FormItem>
          <FormItem 
            name="description"
            label="Description">
            <Input type="textarea" />
          </FormItem>
        </Form>
    </Modal>
  );
}

export default IssuingBatchForm;