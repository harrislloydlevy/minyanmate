class Event < ActiveRecord::Base
  belongs_to :minyan
  has_many :rsvps, dependent: :destroy
  has_many :yids, through: :rsvps

  validates :date, presence: :true

  def in_attendance(yid)
    self.yid_ids.include?(yid.id)
  end

  def attend(yid)
    if not in_attendance(yid)
      self.yids << yid
    end
  end

  def minyan?
    num_rsvps >= 10
  end

  def num_rsvps
    self.yids.count
  end

  def send_reminders
    todays_minyans = Minyan.all.collect { |m| m.upcoming_period(1) }
    upcoming_minyans = Minyan.all.collect { |m| m.upcoming_period(2, Date.today()+1) }

    todays_minyans.each {|e| e.confirmation}
    upcoming_minyans.each {|e| e.reminder}
  end

  def confirmation(event)
    EventMailer.confirmation(event)
  end
  
  def reminder(event)
    EventMailer.reminder(event)
  end

  def cancel_messages
    # Send email and SMSs
    EventMailer.cancellation(self)
  end

  def success_messages
    # Send email and SMSs
    EventMailer.success(self)
  end

  # Who should be notified on reminder emails to ask people to come
  # PENDING: Implment opt out of emails
  def reminder_recipients(event)
    # For reminders we will not bother anyone who has already confirmed
    # so we sent to all of the regulars LESS those who has RSVP'd
    (event.minyan.yids - event.yids)
  end

  # Who should be notified on confirmation emails that an event
  # is happening/not-happening
  # PENDING: Implment opt out of emails
  def confirmation_recipients(event)
    # First we find all the email addresses we can for this event. This
    # means all regulars of the minyan, and everyone who has RSVP'd. This
    # isn't just a reminder it's a status update
    
    ((event.yids + event.minyan.yids).uniq).select{ |r| not r.email.blank? }
  end
end
