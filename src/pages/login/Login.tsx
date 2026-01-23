import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, message, ConfigProvider } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

// Component
import { Logo } from '@/src/components/common/Logo';

// Interface
import { LoginPayload } from '@/src/types/entity/auth.interface';
import { Auth } from '@/src/api/auth';
import { COLORS } from '@/src/constants/app';

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
    } catch { }
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
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: COLORS.primary,
          borderRadius: 4,
          fontFamily: "'Inter', 'Sarabun', sans-serif",
        },
      }}
    >
      <div className="min-h-screen flex w-full">
        {/* Left Side - Brand & Aesthetic */}
        <div className="hidden lg:flex w-1/2 bg-primary from-green-900 via-slate-900 to-slate-950 relative overflow-hidden items-center justify-center">
          <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/40 to-transparent"></div>

          <div className="relative z-10 p-12 text-center">
            <div className="mb-8 flex justify-center">
              <div className="p-6 bg-white/5 rounded-full backdrop-blur-sm ring-1 ring-white/10 shadow-2xl">
                <div className="overflow-hidden">
                  <img
                    src="mrgreen1.png"
                    alt="Mr. GREEN PEST CONTROL CO., LTD."
                    className="mx-auto max-h-52 sm:max-h-64 scale-105 object-cover"
                  />
                </div>
              </div>
            </div>
            <h2 className="text-3xl font-bold text-white mb-4 tracking-tight">
              Mr. Green Pest Control Management
            </h2>
            <p className="text-green-100/80 max-w-md mx-auto text-lg leading-relaxed">
              ระบบบริหารจัดการงานบริการกำจัดแมลงครบวงจร
              เพื่อประสิทธิภาพสูงสุดในการดูแลลูกค้าของคุณ
            </p>
          </div>

          <div className="absolute bottom-8 text-white/20 text-xs tracking-widest">
            MR. GREEN SYSTEM V.2.0
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full lg:w-1/2 bg-white flex items-center justify-center p-8 sm:p-12 lg:p-24">
          <div className="w-full max-w-md space-y-8">
            <div className="text-center lg:text-left">
              <div className="lg:hidden mb-8 flex justify-center">
                <Logo variant="dark" size="lg" />
              </div>
              <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
                ยินดีต้อนรับกลับมา
              </h2>
              <p className="mt-2 text-slate-500">
                กรุณาลงชื่อเข้าใช้เพื่อเข้าถึงระบบจัดการ
              </p>
            </div>

            <Form
              form={form}
              name="login"
              onFinish={onFinish}
              layout="vertical"
              size="large"
              initialValues={{ remember: false }}
              className="mt-8 space-y-6"
            >
              <div className="space-y-4">
                <Form.Item
                  name="citizenId"
                  label={<span className="text-slate-700 font-medium">รหัสบัตรประชาชน / Username</span>}
                  rules={[
                    {
                      required: true,
                      message: 'กรุณากรอกรหัสบัตรประชาชน',
                    },
                  ]}
                  className="mb-4"
                >
                  <Input
                    prefix={<UserOutlined className="text-slate-400" />}
                    placeholder="ระบุรหัสผู้ใช้งาน"
                    className="rounded-md py-2.5"
                  />
                </Form.Item>

                <Form.Item
                  name="password"
                  label={<span className="text-slate-700 font-medium">รหัสผ่าน</span>}
                  rules={[{ required: true, message: 'กรุณากรอกรหัสผ่าน' }]}
                  className="mb-2"
                >
                  <Input.Password
                    prefix={<LockOutlined className="text-slate-400" />}
                    placeholder="ระบุรหัสผ่าน"
                    className="rounded-md py-2.5"
                  />
                </Form.Item>
              </div>

              <div className="flex items-center justify-between">
                <Form.Item name="remember" valuePropName="checked" noStyle>
                  <Checkbox className="text-slate-600">จดจำฉันไว้ในระบบ</Checkbox>
                </Form.Item>
                <a href="#" className="text-sm font-medium text-green-700 hover:text-green-600 hidden">
                  ลืมรหัสผ่าน?
                </a>
              </div>

              <Button
                type="primary"
                htmlType="submit"
                className="w-full h-12 text-base font-bold border-none shadow-lg shadow-green-700/20 rounded-md transition-all duration-200"
                style={{ backgroundColor: COLORS.primary }}
                loading={loading}
              >
                เข้าสู่ระบบ
              </Button>
            </Form>

            <div className="mt-10 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
              <p>&copy; {new Date().getFullYear()} Mr. Green Pest Control Co., Ltd. All rights reserved.</p>
              <p className="mt-1">Secure Access System</p>
            </div>
          </div>
        </div>
      </div>
    </ConfigProvider>
  );
};

export default Login;
