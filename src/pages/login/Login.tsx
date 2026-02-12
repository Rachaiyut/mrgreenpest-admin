import React, { useState, useEffect } from 'react';
import { Form, Input, Button, Checkbox, message, ConfigProvider, Select } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';

// Component
import { Logo } from '@/src/components/common/Logo';

// Interface
import { LoginPayload } from '@/src/types/entity/auth.interface';
import { Auth } from '@/src/api/auth';
interface LoginProps {
  onLogin: (username: string, remember: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [demoUsers, setDemoUsers] = useState<any[]>([]);
  const navigate = useNavigate();

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

    // Fetch demo users
    Auth.getDemoUsers()
      .then((users) => {
        if (Array.isArray(users)) {
          setDemoUsers(users);
        }
      })
      .catch((err) => console.error('Failed to fetch demo users', err));
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

        // Check role and redirect
        const user = response.user; // Assuming response includes user info
        
        // Wait for state updates to propagate
        setTimeout(() => {
             // In AppRouter, default redirect logic might interfere.
             // We use window.location.href or direct navigation with state
             if (user && (user.role === 'LEAD_TECH' || user.role === 'TECH')) {
                  // Force redirect to field-jobs
                  window.location.href = '/field-jobs';
             } else {
                  navigate('/');
             }
        }, 100);
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
    <div className="min-h-screen flex w-full">
      {/* Left Side - Brand & Aesthetic */}
      <div className="hidden lg:flex w-1/2 bg-primary from-green-900 via-slate-900 to-slate-950 relative overflow-hidden items-center justify-center">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-t from-black/40 to-transparent"></div>

        <div className="relative z-10 p-12 text-center">
          <div className="mb-8 flex justify-center">
            <div className="p-6 bg-white/5 rounded-full backdrop-blur-sm ring-1 ring-white/10 shadow-2xl">
              <div className="overflow-hidden">
                <img
                  src="/mrgreen1.png"
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
                label={
                  <span className="text-slate-700 font-medium">
                    รหัสบัตรประชาชน / Username
                  </span>
                }
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
                label={
                  <span className="text-slate-700 font-medium">รหัสผ่าน</span>
                }
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
              <a
                href="#"
                className="text-sm font-medium text-green-700 hover:text-green-600 hidden"
              >
                ลืมรหัสผ่าน?
              </a>
            </div>

            <Button
              type="primary"
              htmlType="submit"
              className="w-full h-12 text-base font-bold border-none shadow-lg shadow-green-700/20 rounded-md transition-all duration-200"
              loading={loading}
            >
              เข้าสู่ระบบ
            </Button>

            <div className="pt-4 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-3 text-center">เลือกผู้ใช้งานเพื่อทดสอบ (Demo Users)</p>
              {demoUsers.length > 0 ? (
                <div className="space-y-2 max-h-[240px] overflow-y-auto pr-1 custom-scrollbar">
                  <Select
                    placeholder="ค้นหาผู้ใช้งาน (Role, ชื่อ, นามสกุล)"
                    showSearch
                    filterOption={(input, option) =>
                      (option?.label as string ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    className="w-full"
                    size="large"
                    onChange={(value) => {
                      const selectedUser = demoUsers.find(u => u.citizen_id === value);
                      if (selectedUser) {
                        form.setFieldsValue({
                          citizenId: selectedUser.citizen_id,
                          password: 'password123',
                        });
                      }
                    }}
                    options={demoUsers.map(user => ({
                      value: user.citizen_id,
                      label: `${user.role} - ${user.first_name} ${user.last_name} (${user.nick_name || '-'})`
                    }))}
                  />
                </div>
              ) : (
                <div className="text-center text-xs text-slate-400 italic py-2">
                  กำลังโหลดรายชื่อผู้ใช้งาน...
                </div>
              )}
            </div>
          </Form>

          <div className="mt-10 pt-6 border-t border-slate-100 text-center text-xs text-slate-400">
            <p>
              &copy; {new Date().getFullYear()} Mr. Green Pest Control Co., Ltd.
              All rights reserved.
            </p>
            <p className="mt-1">Secure Access System</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
