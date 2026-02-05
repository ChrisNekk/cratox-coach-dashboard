"use client";

import * as React from "react";
import { ChevronDown, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface MultiSelectOption {
  value: string;
  label: string;
}

interface MultiSelectProps {
  options: MultiSelectOption[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  emptyMessage?: string;
  className?: string;
  badgeClassName?: string;
  maxDisplay?: number;
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Select items...",
  emptyMessage = "No items found.",
  className,
  badgeClassName,
  maxDisplay = 3,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const handleSelect = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((item) => item !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  const handleRemove = (value: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(selected.filter((item) => item !== value));
  };

  const handleClearAll = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange([]);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div
          role="combobox"
          aria-expanded={open}
          className={cn(
            "flex items-center justify-between w-full min-h-10 h-auto rounded-md border border-input bg-background text-sm ring-offset-background cursor-pointer hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            selected.length > 0 ? "px-2 py-1.5" : "px-3 py-2",
            className
          )}
          tabIndex={0}
        >
          <div className="flex flex-wrap gap-1 flex-1">
            {selected.length === 0 ? (
              <span className="text-muted-foreground">{placeholder}</span>
            ) : selected.length <= maxDisplay ? (
              selected.map((value) => {
                const option = options.find((opt) => opt.value === value);
                return (
                  <Badge
                    key={value}
                    variant="secondary"
                    className={cn("mr-1 gap-1", badgeClassName)}
                  >
                    {option?.label || value}
                    <span
                      role="button"
                      tabIndex={0}
                      className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onChange(selected.filter((item) => item !== value));
                        }
                      }}
                      onClick={(e) => handleRemove(value, e)}
                    >
                      <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                    </span>
                  </Badge>
                );
              })
            ) : (
              <>
                {selected.slice(0, maxDisplay).map((value) => {
                  const option = options.find((opt) => opt.value === value);
                  return (
                    <Badge
                      key={value}
                      variant="secondary"
                      className={cn("mr-1 gap-1", badgeClassName)}
                    >
                      {option?.label || value}
                      <span
                        role="button"
                        tabIndex={0}
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer"
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onChange(selected.filter((item) => item !== value));
                          }
                        }}
                        onClick={(e) => handleRemove(value, e)}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </span>
                    </Badge>
                  );
                })}
                <Badge variant="secondary" className={badgeClassName}>
                  +{selected.length - maxDisplay} more
                </Badge>
              </>
            )}
          </div>
          <div className="flex items-center gap-1 ml-2 flex-shrink-0">
            {selected.length > 0 && (
              <span
                role="button"
                tabIndex={0}
                className="rounded-full p-0.5 hover:bg-muted cursor-pointer"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onChange([]);
                  }
                }}
                onClick={handleClearAll}
              >
                <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
              </span>
            )}
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput placeholder="Search..." />
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => {
                const isSelected = selected.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => handleSelect(option.value)}
                  >
                    <div
                      className={cn(
                        "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                        isSelected
                          ? "bg-primary text-primary-foreground"
                          : "opacity-50 [&_svg]:invisible"
                      )}
                    >
                      <svg
                        className="h-3 w-3"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={3}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </div>
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
