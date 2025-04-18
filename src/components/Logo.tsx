import logo from '../assets/logo.svg';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = "h-8 w-auto" }: LogoProps) {
  return (
    <img
      src={logo}
      alt="MNY Logo"
      className={className}
    />
  );
}