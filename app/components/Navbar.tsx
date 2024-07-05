"use client";

import { useAuthenticator } from "@aws-amplify/ui-react";
import { CircleUserRound, LogOut, NotebookPen, Settings } from "lucide-react";
import Link from "next/link";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"


export const NavContainer = ({ children }: React.PropsWithChildren<{}>) => {
  return (
    <header className="flex flex-wrap sm:justify-start sm:flex-nowrap z-50 w-full bg-white text-sm py-4 dark:bg-gray-800">
      <nav
        className="max-w-[85rem] w-full mx-auto px-4 sm:flex sm:items-center sm:justify-between h-10 z-10"
        aria-label="Global"
      >
        {children}
      </nav>
    </header>
  );
};

export default function SecureNav() {
  const { user, signOut } = useAuthenticator((context) => [context.user]);
  const router = useRouter();

  function logout(): void {
    setIsOpen(false);
    signOut();
    router.push("/");
  }

  const [isOpen, setIsOpen] = useState(false);

  function handleBlur(event : any) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
        setIsOpen(false);
    }
  }

  function handleNaviate(href : string) {
    router.push(href);
    setIsOpen(false);
  }

  if(!user) return null;

  return (
    <NavContainer>
      <div className="hidden md:block">
        <Link
          className="flex-none text-xl font-semibold dark:text-white"
          href="/"
        >
          WATT
        </Link>
      </div>
      <div className="m-auto w-full md:max-w-96">
        <Command
          onBlur={handleBlur}
          onFocus={() => setIsOpen(true)}
          className="border border-grey-800"
        >
          <CommandInput
            className="border-none focus:ring-0 h-8"
            placeholder="Type a command or search..."
          />
          <div className={`relative bg-white ${!isOpen && "hidden"}`}>
            <CommandList>
              <CommandEmpty>No results found.</CommandEmpty>
              <CommandGroup heading="Suggestions">
                <CommandItem onSelect={() => handleNaviate("/surveys/create")}>
                  <NotebookPen className="mr-2 h-4 w-4" />
                  <span>Create Survey</span>
                </CommandItem>
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup heading="Nav">
                <CommandItem onSelect={() => handleNaviate("/surveys")}>
                  <span>Surveys</span>
                  <CommandShortcut>⌘S</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => handleNaviate("/elements")}>
                  <span>Elements</span>
                  <CommandShortcut>⌘E</CommandShortcut>
                </CommandItem>
                <CommandItem
                  onSelect={() => handleNaviate("/building-components")}
                >
                  <span>Components</span>
                  <CommandShortcut>⌘C</CommandShortcut>
                </CommandItem>
              </CommandGroup>
              <CommandGroup heading="Settings">
                <CommandItem>
                  <CircleUserRound className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                  <CommandShortcut>⌘P</CommandShortcut>
                </CommandItem>
                <CommandItem onSelect={() => handleNaviate("/settings")}>
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
      </div>
      <Avatar className="hidden md:block">
        <AvatarImage src="https://github.com/shadcn.png" />
        <AvatarFallback>CN</AvatarFallback>
      </Avatar>
    </NavContainer>
  );
}
