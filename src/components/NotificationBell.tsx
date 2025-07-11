import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { NotificationList } from './NotificationList';
import { useNotificationsWithReadStatus, useUnreadNotificationCount } from '@/hooks/useNotificationsWithReadStatus';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useVisibilityRefresh } from '@/hooks/useVisibilityRefresh';

interface NotificationBellProps {
  className?: string;
  variant?: 'default' | 'mobile';
}

export function NotificationBell({ className, variant = 'default' }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const { user } = useCurrentUser();
  const { isLoading } = useNotificationsWithReadStatus();
  const unreadCount = useUnreadNotificationCount();
  
  // Auto-refresh notifications when tab becomes visible
  useVisibilityRefresh();

  // Don't show notification bell if user is not logged in
  if (!user) {
    return null;
  }

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
  };

  if (variant === 'mobile') {
    return (
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={`relative ${className}`}
          >
            <Bell className={`h-5 w-5 ${isLoading ? 'animate-pulse' : ''}`} />
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-80 p-0" 
          align="end"
          side="bottom"
          sideOffset={8}
        >
          <NotificationList />
        </PopoverContent>
      </Popover>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          className={`w-full justify-start relative ${className}`}
        >
          <Bell className={`mr-2 h-4 w-4 ${isLoading ? 'animate-pulse' : ''}`} />
          Notifications
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="ml-auto h-5 w-5 rounded-full p-0 flex items-center justify-center text-xs"
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-80 p-0" 
        align="start"
        side="right"
        sideOffset={8}
      >
        <NotificationList />
      </PopoverContent>
    </Popover>
  );
}