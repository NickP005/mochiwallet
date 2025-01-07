import { generateColorFromTag, getInitials } from "@/lib/utils/colors";
import { Avatar, AvatarFallback } from "./avatar";

export const AccountAvatar = ({ name, emoji, tag, className }: { name: string, emoji?: string, tag: string, className?: string }) => {
    const avatarColor = generateColorFromTag(tag)

    return (
        <Avatar className={className}>
            <AvatarFallback style={{
                backgroundColor: avatarColor,
                color: 'white',
                fontSize: '0.875rem',
                fontWeight: 500
            }}>{emoji || getInitials(name || '')}</AvatarFallback>
        </Avatar>
    )
}       