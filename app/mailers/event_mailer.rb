class EventMailer < ActionMailer::Base
  default from: "robot@TheMinyanMan.com"

  def confirmation(event)
      @event = event
      mail(to: "",
        bcc: yids_to_emails(event.reminder_participants),
        subject: sprintf("MM: Confirmation of %s on %s", event.minyan.title, event.date.to_formatted_s(:short))
          ).deliver
  end

  def reminder(event, yids)
      @event = event
      mail(to: "",
        bcc: yids_to_emails(event.reminder_participants),
        subject: sprintf("MM: Reminder %s on %s", event.minyan.title, event.date.to_formatted_s(:short))
          ).deliver
  end

  def success(event)
      @event = event
      mail(to: "",
        bcc: yids_to_emails(event.confirmation_participants),
        subject: sprintf("MM: Minyan Confirmed for %s on %s", event.minyan.title, event.date.to_formatted_s(:short))
          ).deliver
  end

  def cancellation(event)
      @event = event
      mail(to: "",
        bcc: yids_to_emails(event.confirmation_participants),
        subject: sprintf("MM: Cancellation for %s on %s", event.minyan.title, event.date.to_formatted_s(:short))
          ).deliver
  end

  private
    def yids_to_emails(yids)
      # Get an array of emails from an array of yids
      yids.select{ |r| not r.email.blank? }.map{ |r| r.email }
    end
end

