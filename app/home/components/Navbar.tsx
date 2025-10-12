'use client';

import { CircleUserRound, LogOut, NotebookPen, Settings } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { forwardRef, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { v4 } from 'uuid';
import { signOut } from 'aws-amplify/auth';
import useUser from '../utils/useUser';

export const NavContainer = ({ children }: React.PropsWithChildren<{}>) => {
  return (
    <header className="z-50 flex w-full flex-wrap bg-white py-4 text-sm dark:bg-gray-800 sm:flex-nowrap sm:justify-start">
      <nav
        className="z-50 mx-auto flex h-10 w-full max-w-[85rem] items-center justify-between px-4"
        aria-label="Global"
      >
        {children}
      </nav>
    </header>
  );
};

export default function SecureNav() {
  const [isOpen, setIsOpen] = useState(false);
  const cmdBarRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen && cmdBarRef.current) {
      cmdBarRef.current.focus();
    }
  }, [isOpen]);

  return (
    <div className="flex-1">
      <CommandBar />
    </div>
  );
}

interface CommandBarProps {
  onSelected?: (href: string) => void;
  onBlur?: () => void;
}

const CommandBar = forwardRef<HTMLInputElement, CommandBarProps>(function CommandBar(
  { onSelected, onBlur }: CommandBarProps,
  ref,
) {
  const user = useUser();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  function logout(): void {
    setIsOpen(false);
    signOut();
    router.push('/');
  }

  function handleBlur(event: any) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsOpen(false);
      onBlur && onBlur();
    }
  }

  function handleNaviate(href: string) {
    router.push(href);
    setIsOpen(false);
    onSelected && onSelected(href);
  }

  if (!user) return null;
  return (
    <Command onBlur={handleBlur} onFocus={() => setIsOpen(true)} className="border-grey-800 border">
      <CommandInput
        ref={ref}
        className="h-8 border-none focus:ring-0"
        placeholder="Type a command or search..."
      />
      <div className={`relative bg-white ${!isOpen && 'hidden'}`}>
        <CommandList>
          <CommandEmpty>No results found.</CommandEmpty>
          <CommandGroup heading="Suggestions">
            <CommandItem onSelect={() => handleNaviate(`/surveys/create?id=${v4()}`)}>
              <NotebookPen className="mr-2 h-4 w-4" />
              <span>Create Survey</span>
            </CommandItem>
          </CommandGroup>
          <CommandSeparator />
          <CommandGroup heading="Nav">
            <CommandItem onSelect={() => handleNaviate('/surveys')}>
              <span>Surveys</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Config">
            <CommandItem onSelect={() => handleNaviate('/elements')}>
              <span>Elements</span>
              <CommandShortcut>⌘E</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => handleNaviate('/building-components')}>
              <span>Components</span>
              <CommandShortcut>⌘C</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Settings">
            <CommandItem onSelect={() => handleNaviate('/profile')}>
              <CircleUserRound className="mr-2 h-4 w-4" />
              <span>Profile</span>
              <CommandShortcut>⌘P</CommandShortcut>
            </CommandItem>
            <CommandItem onSelect={() => handleNaviate('/settings')}>
              <Settings className="mr-2 h-4 w-4" />
              <span>Settings</span>
              <CommandShortcut>⌘S</CommandShortcut>
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Actions">
            <CommandItem onSelect={() => logout()}>
              <LogOut className="mr-2 h-4 w-4" />
              <span>SignOut</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </div>
    </Command>
  );
});
