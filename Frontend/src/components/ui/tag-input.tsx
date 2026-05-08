import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface TagInputProps {
  value: string[];
  onChange: (value: string[]) => void;
  placeholder?: string;
  className?: string;
}

export const TagInput = ({
  value,
  onChange,
  placeholder,
  className,
}: TagInputProps) => {
  const [inputValue, setInputValue] = useState("");

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const newTag = inputValue.trim();
      if (newTag && !value.includes(newTag)) {
        onChange([...value, newTag]);
      }
      setInputValue("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    onChange(value.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div
      className={cn(
        "border border-input bg-background rounded-md p-2 flex flex-wrap gap-2 items-center",
        className
      )}
    >
      {value.map((tag) => (
        <Badge key={tag} variant="secondary" className="text-sm">
          {tag}
          <button
            type="button"
            onClick={() => removeTag(tag)}
            className="ml-2 rounded-full hover:bg-destructive/20 p-0.5"
          >
            <X className="h-3 w-3" />
          </button>
        </Badge>
      ))}
      <Input
        type="text"
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || "Add a tag and press Enter"}
        className="flex-1 border-none shadow-none focus-visible:ring-0 h-8 p-1"
      />
    </div>
  );
};
