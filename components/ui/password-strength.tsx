import React from 'react';
import { cn } from '@/lib/utils';
import { Check, X } from 'lucide-react';

interface PasswordRequirements {
  minLength: boolean;
  hasUpperCase: boolean;
  hasLowerCase: boolean;
  hasNumbers: boolean;
  hasSpecialChar: boolean;
}

interface PasswordStrengthProps {
  password: string;
  requirements: PasswordRequirements;
  strength: 'weak' | 'medium' | 'strong';
}

export function PasswordStrength({ password, requirements, strength }: PasswordStrengthProps) {
  const getStrengthColor = () => {
    switch (strength) {
      case 'weak':
        return 'bg-red-500';
      case 'medium':
        return 'bg-yellow-500';
      case 'strong':
        return 'bg-green-500';
      default:
        return 'bg-gray-300';
    }
  };

  const getStrengthWidth = () => {
    switch (strength) {
      case 'weak':
        return 'w-1/3';
      case 'medium':
        return 'w-2/3';
      case 'strong':
        return 'w-full';
      default:
        return 'w-0';
    }
  };

  const requirementItems = [
    { key: 'minLength', label: 'At least 8 characters', met: requirements.minLength },
    { key: 'hasUpperCase', label: 'One uppercase letter', met: requirements.hasUpperCase },
    { key: 'hasLowerCase', label: 'One lowercase letter', met: requirements.hasLowerCase },
    { key: 'hasNumbers', label: 'One number', met: requirements.hasNumbers },
    {
      key: 'hasSpecialChar',
      label: 'One special character (!@#$%^&*)',
      met: requirements.hasSpecialChar,
    },
  ];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600">Password strength</span>
          <span
            className={cn(
              'font-medium capitalize',
              strength === 'weak' && 'text-red-600',
              strength === 'medium' && 'text-yellow-600',
              strength === 'strong' && 'text-green-600',
            )}
          >
            {strength}
          </span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-200">
          <div
            className={cn(
              'h-2 rounded-full transition-all duration-300',
              getStrengthColor(),
              getStrengthWidth(),
            )}
          />
        </div>
      </div>

      {/* Requirements List */}
      <div className="space-y-1">
        <p className="text-sm font-medium text-gray-600">Password must include:</p>
        <ul className="space-y-1">
          {requirementItems.map((item) => (
            <li key={item.key} className="flex items-center text-sm">
              <div className="mr-2 h-4 w-4 flex-shrink-0">
                {item.met ? (
                  <Check className="h-4 w-4 text-green-500" />
                ) : (
                  <X className="h-4 w-4 text-gray-400" />
                )}
              </div>
              <span
                className={cn('transition-colors', item.met ? 'text-green-700' : 'text-gray-500')}
              >
                {item.label}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
