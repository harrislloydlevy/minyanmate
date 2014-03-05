class EventMailer < ActionMailer::Base
  default from: "minder@minyanminder.com"

  def reminder(event)
      @event = event
      mail(to: "",
        bcc: recipients(event),
        subject: sprintf("Reminder %s on %s", event.minyan.title, event.date.to_formatted_s(:short))
          ).deliver
  end

  def success(event)
    @event = event
    logger.debug "confirming event!"
  end

  def cancellation(event)
    @event = event
    logger.debug "Cancelling event!"
  end

  private
    def recipients(event)
      # First we find all the email addresses we can for this event. This
      # means all regulars of the minyan, and everyone who has RSVP'd. This
      # isn't just a reminder it's a status update
      
      ap recipient_yids = ((event.yids + event.minyan.yids).uniq).select{ |r| not r.email.blank? }


      return recipient_yids.map{ |x| x.email}
    end
end
