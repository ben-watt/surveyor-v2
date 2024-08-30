"use client";

import { useAuthenticator } from "@aws-amplify/ui-react";
import {
  CircleUserRound,
  LogOut,
  Menu,
  NotebookPen,
  Settings,
  X,
} from "lucide-react";
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
import { forwardRef, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import dynamic from "next/dynamic";
import {
  fetchUserAttributes,
  FetchUserAttributesOutput,
} from "aws-amplify/auth";
import { getUrl } from "aws-amplify/storage";
import { v4 } from "uuid";

const NetworkStatus = dynamic(
  () => import("./NetworkStatus").then((mod) => mod.NetworkStatus),
  { ssr: false }
);

export const NavContainer = ({ children }: React.PropsWithChildren<{}>) => {
  return (
    <header className="flex flex-wrap sm:justify-start sm:flex-nowrap z-50 w-full bg-white text-sm py-4 dark:bg-gray-800">
      <nav
        className="max-w-[85rem] w-full mx-auto px-4 h-10 z-10 flex justify-between items-center"
        aria-label="Global"
      >
        {children}
      </nav>
    </header>
  );
};

export default function SecureNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [profileHref, setProfileHref] = useState<string | undefined>();
  const cmdBarRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen && cmdBarRef.current) {
      cmdBarRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    async function getProfilePic() {
      try {
        const userAttributes = await fetchUserAttributes();
        const pPic = userAttributes?.profile;
        if (pPic) {
          const presignedUrl = await getUrl({
            path: pPic,
          });

          setProfileHref(presignedUrl.url.href);
        }
      } catch (error) {
        console.error("Failed to fetch user profile picture", error);
      }
    }

    getProfilePic();
  }, []);

  return (
    <div>
      <NavContainer>
        <div className="hidden md:block">
          <Link
            className="flex-none text-xl font-semibold dark:text-white"
            href="/"
          >
            SURVEYOR
          </Link>
        </div>
        <div className="m-auto w-full md:max-w-96 hidden md:block">
          <CommandBar />
        </div>
        <div className="md:hidden">
          {isOpen ? (
            <X onClick={(ev) => setIsOpen((p) => !p)} />
          ) : (
            <Menu onClick={(ev) => setIsOpen((p) => !p)} />
          )}
        </div>
        <div className="relative w-10">
          <Link href="/profile">
            <Avatar>
              <AvatarImage src={profileHref} />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div className="absolute -top-1 -right-1">
              <NetworkStatus />
            </div>
          </Link>
        </div>
      </NavContainer>
      {isOpen && (
        <div className="bg-color-white z-10">
          <div className="md:hidden w-full p-2">
            <CommandBar
              ref={cmdBarRef}
              onSelected={() => setIsOpen(false)}
              onBlur={() => setIsOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

interface CommandBarProps {
  onSelected?: (href: string) => void;
  onBlur?: () => void;
}

const CommandBar = forwardRef<HTMLInputElement, CommandBarProps>(
  function CommandBar({ onSelected, onBlur }: CommandBarProps, ref) {
    const { user, signOut } = useAuthenticator((context) => [context.user]);
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);

    function logout(): void {
      setIsOpen(false);
      signOut();
      router.push("/");
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
      <Command
        onBlur={handleBlur}
        onFocus={() => setIsOpen(true)}
        className="border border-grey-800"
      >
        <CommandInput
          ref={ref}
          className="border-none focus:ring-0 h-8"
          placeholder="Type a command or search..."
        />
        <div className={`relative bg-white ${!isOpen && "hidden"}`}>
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
              <CommandItem onSelect={() => handleNaviate("/surveys")}>
                <span>Surveys</span>
                <CommandShortcut>⌘S</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            <CommandGroup heading="Config">
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
              <CommandItem onSelect={() => handleNaviate("/profile")}>
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
    );
  }
);
