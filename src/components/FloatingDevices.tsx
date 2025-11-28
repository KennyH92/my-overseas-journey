import { Smartphone, Radio, CreditCard, Fingerprint, Shield, Cpu } from "lucide-react";

export const FloatingDevices = () => {
  const devices = [
    { Icon: Smartphone, position: "top-20 left-12", delay: "0s", color: "text-blue-300" },
    { Icon: Radio, position: "top-32 right-24", delay: "1s", color: "text-blue-200" },
    { Icon: CreditCard, position: "bottom-32 left-20", delay: "2s", color: "text-orange-200" },
    { Icon: Fingerprint, position: "bottom-40 right-32", delay: "1.5s", color: "text-blue-300" },
    { Icon: Shield, position: "top-1/3 left-1/4", delay: "0.5s", color: "text-red-200" },
    { Icon: Cpu, position: "top-1/2 right-1/4", delay: "2.5s", color: "text-blue-200" },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none">
      {devices.map((device, index) => (
        <div
          key={index}
          className={`absolute ${device.position} opacity-10 animate-float`}
          style={{
            animationDelay: device.delay,
            animationDuration: "6s",
          }}
        >
          <device.Icon className={`w-16 h-16 ${device.color}`} strokeWidth={1} />
        </div>
      ))}
      
      {/* Additional smaller devices */}
      <div className="absolute top-1/4 right-12 opacity-10 animate-float" style={{ animationDelay: "3s", animationDuration: "8s" }}>
        <Smartphone className="w-12 h-12 text-blue-200" strokeWidth={1} />
      </div>
      <div className="absolute bottom-1/4 left-32 opacity-10 animate-float" style={{ animationDelay: "1s", animationDuration: "7s" }}>
        <Shield className="w-10 h-10 text-blue-300" strokeWidth={1} />
      </div>
    </div>
  );
};
