import React, { useContext, useState } from "react";
import { LuCircleAlert, LuEye, LuEyeOff, LuLoaderCircle } from "react-icons/lu";
import { useNavigate } from "react-router-dom";
import AuthLayout from "../../components/layouts/AuthLayout";
import axiosInstance from "../../utils/axiosInstance";
import { API_PATHS } from "../../utils/apiPaths";
import { validateEmail } from "../../utils/helper";
import { UserContext } from "../../context/userContext";

const fieldClass =
  "h-[42px] w-full rounded-[9px] border border-[#D7D6D1] bg-white px-[13px] text-[13.5px] text-[#15181C] outline-none placeholder:text-[#A8ADB5] focus:border-[#15594A] focus:ring-[3px] focus:ring-[#E7F0EC]";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const { updateUser } = useContext(UserContext);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();

    const entered = identifier.trim();

    // The API matches either the email or the mobile number, so accept both
    // rather than turning a valid sign-in away for not looking like an email.
    if (!entered) {
      setError("Enter your email address or mobile number.");
      return;
    }
    if (entered.includes("@") && !validateEmail(entered)) {
      setError("That email address does not look right.");
      return;
    }
    if (!password) {
      setError("Enter your password.");
      return;
    }

    setError("");
    setSubmitting(true);

    // Login API Calls
    try {
      const response = await axiosInstance.post(API_PATHS.AUTH.LOGIN, {
        email: entered,
        password
      });
      const { token, user } = response.data;

      if (token) {
        localStorage.setItem("token", token);
        updateUser(user);
        navigate("/dashboard");
      }

    } catch (error) {
      if (error.response && error.response.data.message) {
        setError(error.response.data.message);
      } else {
        setError("Something went wrong. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout>
      <h1 className="m-0 text-[30px] leading-[1.1] font-semibold tracking-[-0.028em]">Sign in</h1>
      <p className="mt-[9px] mb-7 text-[13.5px] leading-[1.55] text-[#5A636D]">
        Excise label movements are recorded against your name. Use your own account.
      </p>

      <form onSubmit={handleLogin} className="flex flex-col gap-4" noValidate>
        <div>
          <label htmlFor="identifier" className="mb-1.5 block text-xs font-medium text-[#3C434B]">
            Email or mobile number
          </label>
          <input
            id="identifier"
            name="identifier"
            type="text"
            autoComplete="username"
            placeholder="you@boblte.lk"
            className={fieldClass}
            value={identifier}
            onChange={({ target }) => setIdentifier(target.value)}
          />
        </div>

        <div>
          <label htmlFor="password" className="mb-1.5 block text-xs font-medium text-[#3C434B]">
            Password
          </label>
          <div className="flex h-[42px] items-center gap-2 rounded-[9px] border border-[#D7D6D1] bg-white px-[13px] focus-within:border-[#15594A] focus-within:ring-[3px] focus-within:ring-[#E7F0EC]">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="••••••••••"
              className="min-w-0 flex-1 border-0 bg-transparent text-[13.5px] text-[#15181C] outline-none placeholder:text-[#A8ADB5]"
              value={password}
              onChange={({ target }) => setPassword(target.value)}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((shown) => !shown)}
              className="flex h-[26px] w-[26px] shrink-0 cursor-pointer items-center justify-center rounded-md text-[#5A636D] hover:bg-[#F2F1ED]"
            >
              {showPassword ? <LuEyeOff /> : <LuEye />}
            </button>
          </div>
        </div>

        {error && (
          <p
            role="alert"
            className="m-0 flex items-start gap-2 rounded-lg border border-[#F3C9C7] bg-[#FCEBEA] px-3 py-2.5 text-[12.5px] text-[#7A2322]"
          >
            <LuCircleAlert className="mt-px shrink-0 text-sm" />
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="mt-1 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-[9px] border border-[#15594A] bg-[#15594A] text-sm font-semibold tracking-[-0.005em] text-white hover:bg-[#124C3F] disabled:cursor-not-allowed disabled:border-[#E3E2DE] disabled:bg-[#F2F1ED] disabled:text-[#A8ADB5]"
        >
          {submitting && <LuLoaderCircle className="animate-spin text-base" />}
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>

      <p className="mt-5 mb-0 text-[11.5px] leading-[1.55] text-[#5A636D]">
        Accounts are created by an administrator. Ask yours if you cannot get in or need
        your password reset.
      </p>
    </AuthLayout>
  )
}

export default Login
