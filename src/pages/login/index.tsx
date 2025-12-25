import React, { useState, useEffect } from 'react';
import { Card } from '../../components/common/Card';
import { FormField, Input, Button } from '../../components/common/FormControls';

interface LoginProps {
  onLogin: (username: string, remember: boolean) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    try {
      const remembered = localStorage.getItem('rememberedUsername') || '';
      const rememberFlag = localStorage.getItem('rememberMe') === 'true';
      if (rememberFlag && remembered) {
        setUsername(remembered);
        setRemember(true);
      }
    } catch {}
  }, []);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      alert('กรุณากรอกชื่อผู้ใช้และรหัสผ่าน');
      return;
    }
    try {
      if (remember) {
        localStorage.setItem('rememberMe', 'true');
        localStorage.setItem('rememberedUsername', username);
      } else {
        localStorage.removeItem('rememberMe');
        localStorage.removeItem('rememberedUsername');
      }
    } catch {}
    onLogin(username, remember);
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
              <FormField label="ชื่อผู้ใช้" htmlFor="username">
                <Input id="username" type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="กรอกชื่อผู้ใช้" required />
              </FormField>
              <FormField label="รหัสผ่าน" htmlFor="password">
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="กรอกรหัสผ่าน" required />
              </FormField>
              <div className="flex items-center gap-2">
                <Input id="remember" type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                <label htmlFor="remember" className="text-sm text-slate-700">จดจำการเข้าสู่ระบบ</label>
              </div>
              <Button type="submit" className="w-full py-2.5 px-4 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold shadow-sm">เข้าสู่ระบบ</Button>
            </form>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Login;
