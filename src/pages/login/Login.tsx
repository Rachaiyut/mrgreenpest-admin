import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { FormField, Input, Button } from '../../components/common/FormControls';
import { useNavigate } from 'react-router-dom';

// Interface
import { ILoginPayload } from '@/src/libs/common/interface/entity/auth.interface';
import { ILoginProps } from '@/src/libs/common/interface/prop/login.props';
import { Auth } from '@/src/libs/api/auth';

const Login: React.FC<ILoginProps> = ({ onLogin }) => {
  const [citizenId, setCitizenId] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    try {
      const remembered = localStorage.getItem('rememberedCitizenId') || '';
      const rememberFlag = localStorage.getItem('rememberMe') === 'true';
      if (rememberFlag && remembered) {
        setCitizenId(remembered);
        setRemember(true);
      }
    } catch {}
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!citizenId.trim() || !password.trim()) {
      alert('กรุณากรอกรหัสบัตรประชาชนและรหัสผ่าน');
      return;
    }

    setLoading(true);
    try {
      const payload: ILoginPayload = {
        citizen_id: citizenId,
        password: password,
      };
      
      const response = await Auth.login(payload);
      
      console.log("response", response)

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
        alert('เข้าสู่ระบบไม่สำเร็จ: ไม่ได้รับ Token');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const message = error.response?.data?.message || error.message || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
      alert(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex items-center justify-center bg-primary/5">
        <div className="text-center px-8">
          <img src="/LOGO-GO mrgreen.png" alt="Mr. GREEN PEST CONTROL CO., LTD." className="mx-auto max-h-52 sm:max-h-64" />
        </div>
      </div>
      <div className="flex items-center justify-center p-6 sm:p-8">
        <div className="w-full max-w-md">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
              <h2 className="text-2xl font-bold text-slate-800">เข้าสู่ระบบ</h2>
              <FormField label="รหัสบัตรประชาชน" htmlFor="citizenId">
                <Input 
                  id="citizenId" 
                  type="text" 
                  value={citizenId} 
                  onChange={(e) => setCitizenId(e.target.value)} 
                  placeholder="กรอกรหัสบัตรประชาชน" 
                  required 
                  disabled={loading}
                />
              </FormField>
              <FormField label="รหัสผ่าน" htmlFor="password">
                <Input 
                  id="password" 
                  type="password" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  placeholder="กรอกรหัสผ่าน" 
                  required 
                  disabled={loading}
                />
              </FormField>
              <div className="flex items-center gap-2">
                <Input 
                  id="remember" 
                  type="checkbox" 
                  checked={remember} 
                  onChange={(e) => setRemember(e.target.checked)} 
                  disabled={loading}
                />
                <label htmlFor="remember" className="text-sm text-slate-700">จดจำการเข้าสู่ระบบ</label>
              </div>
              <Button 
                type="submit" 
                className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={loading}
              >
                {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบ'}
              </Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
