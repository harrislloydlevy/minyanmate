class EventMailer < ActionMailer::Base
  default from: "robot@TheMinyanMan.com"

  def confirmation(event)
      @event  = event
      subject = "MM: Confirmation of %s on %s" % [event.minyan.title, event.date.to_formatted_s(:short)]
      recips  = yids_to_emails(event.confirmation_recipients)

      if (recips.count > 0)
        mail(:to => "", bcc: recip, subject: subject).deliver
      end
  end

  def reminder(event)
      @event  = event
      subject = "MM: Reminder of %s on %s" % [event.minyan.title, event.date.to_formatted_s(:short)]
      recips  = yids_to_emails(event.confirmation_recipients)

      if (recips.count > 0)
        mail(:to => "", bcc: recip, subject: subject).deliver
      end
  end

  def success(event)
      @event  = event
      subject = "MM: Minyan for %s on %s!" % [event.minyan.title, event.date.to_formatted_s(:short)]
      recips  = yids_to_emails(event.confirmation_recipients)

      if (recips.count > 0)
        mail(:to => "", bcc: recip, subject: subject).deliver
      end
  end

  def cancellation(event)
      @event  = event
      subject = "MM: Cancellation for %s on %s" % [event.minyan.title, event.date.to_formatted_s(:short)]
      recips  = yids_to_emails(event.confirmation_recipients)

      if (recips.count > 0)
        mail(:to => "", bcc: recip, subject: subject).deliver
      end
  end

  def yids_to_emails(yids)
    print "Yids:"
    ap yids
    # Get an array of emails from an array of yids
    emails = yids.select{ |r| not r.email.blank? }.map{ |r| r.email }
    print "Emails:"
    ap emails
    emails
  end
end

