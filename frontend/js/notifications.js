// Universal Notification System
window.NotificationSystem = {
    // Show notification with improved styling and animations
    show: function(message, type = 'info', duration = 4000) {
        // Remove any existing notifications
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => {
            notif.remove();
        });

        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const iconClass = type === 'success' ? 'fa-check-circle' : 
                         type === 'error' ? 'fa-exclamation-circle' : 
                         type === 'warning' ? 'fa-exclamation-triangle' : 
                         'fa-info-circle';
        
        notification.innerHTML = `
            <i class="fas ${iconClass}"></i>
            <span>${message}</span>
        `;

        document.body.appendChild(notification);

        // Trigger popup animation
        setTimeout(() => {
            notification.classList.add('show', 'popup-in');
        }, 50);

        // Auto-hide after specified duration with popup-out animation
        setTimeout(() => {
            notification.classList.remove('show', 'popup-in');
            notification.classList.add('popup-out');
            setTimeout(() => {
                if (notification.parentNode) {
                    document.body.removeChild(notification);
                }
            }, 400);
        }, duration);

        return notification;
    },

    // Convenience methods
    success: function(message, duration = 4000) {
        return this.show(message, 'success', duration);
    },

    error: function(message, duration = 5000) {
        return this.show(message, 'error', duration);
    },

    warning: function(message, duration = 4500) {
        return this.show(message, 'warning', duration);
    },

    info: function(message, duration = 4000) {
        return this.show(message, 'info', duration);
    },

    // Hide all notifications immediately
    hideAll: function() {
        const existingNotifications = document.querySelectorAll('.notification');
        existingNotifications.forEach(notif => {
            notif.classList.remove('show', 'popup-in');
            notif.classList.add('popup-out');
            setTimeout(() => {
                if (notif.parentNode) {
                    notif.parentNode.removeChild(notif);
                }
            }, 400);
        });
    }
};

// Backward compatibility - global showNotification function
window.showNotification = function(message, type = 'info') {
    return window.NotificationSystem.show(message, type);
};
