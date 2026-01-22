import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

// Interface
import { LoginPayload } from '@/src/types/entity/auth.interface';
import { Auth } from '@/src/api/auth';

interface LoginProps {
  onLogin: (username: string, remember: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const [form] = Form.useForm();

  useEffect(() => {
    try {
      const remembered = localStorage.getItem('rememberedCitizenId') || '';
      const rememberFlag = localStorage.getItem('rememberMe') === 'true';
      if (rememberFlag && remembered) {
        form.setFieldsValue({
          citizenId: remembered,
          remember: true,
        });
      }
    } catch {}
  }, [form]);

  const onFinish = async (values: any) => {
    const { citizenId, password, remember } = values;
    setLoading(true);
    try {
      const payload: LoginPayload = {
        citizen_id: citizenId,
        password: password,
      };

      const response = await Auth.login(payload);

      if (response.access_token) {
        if (remember) {
          localStorage.setItem('rememberMe', 'true');
          localStorage.setItem('rememberedCitizenId', citizenId);
        } else {
          localStorage.removeItem('rememberMe');
          localStorage.removeItem('rememberedCitizenId');
        }

        onLogin(citizenId, remember);
        navigate('/');
      } else {
        message.error('เข้าสู่ระบบไม่สำเร็จ: ไม่ได้รับ Token');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const msg =
        error.response?.data?.message ||
        error.message ||
        'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      message.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex items-center justify-center bg-primary/5">
        <div className="text-center px-8">
          <img
            src="/LOGO-GO mrgreen.png"
            alt="Mr. GREEN PEST CONTROL CO., LTD."
            className="mx-auto max-h-52 sm:max-h-64"
          />
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-8 bg-gray-50">
        <div className="w-full max-w-md">
          <Card className="shadow-lg border-0">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-bold text-slate-800">เข้าสู่ระบบ</h2>
              <p className="text-slate-500 mt-2">
                กรุณากรอกข้อมูลเพื่อเข้าใช้งานระบบ
              </p>
            </div>

            <Form
              form={form}
              name="login"
              onFinish={onFinish}
              layout="vertical"
              size="large"
              initialValues={{ remember: false }}
            >
              <Form.Item
                name="citizenId"
                label="รหัสบัตรประชาชน"
                rules={[
                  {
                    required: true,
                    message: 'กรุณากรอกรหัสบัตรประชาชน',
                  },
                ]}
              >
                <Input
                  prefix={<UserOutlined className="text-slate-400" />}
                  placeholder="กรอกรหัสบัตรประชาชน"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="รหัสผ่าน"
                rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน' }]}
              >
                <Input.Password
                  prefix={<LockOutlined className="text-slate-400" />}
                  placeholder="กรอกรหัสผ่าน"
                />
              </Form.Item>

              <Form.Item>
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox>จดจำฉันไว้ในระบบ</Checkbox>
                </Form.Item>
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  className="w-full h-10 text-base"
                  loading={loading}
                >
                  เข้าสู่ระบบ
                </Button>
              </Form.Item>
            </Form>
          </Card>
          <div className="mt-8 text-center text-sm text-slate-500">
            &copy; {new Date().getFullYear()} Mr. Green Pest Control Co., Ltd.
            All rights reserved.
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

