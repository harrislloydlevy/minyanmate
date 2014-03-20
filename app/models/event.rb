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
 
  # defining as self.name allows calling without instantion of class
  def self.send_event_reminders
    todays_minyans = Minyan.all.collect { |m| m.upcoming_period(1) }.flatten!
    upcoming_minyans = Minyan.all.collect { |m| m.upcoming_period(2, Date.today()+1) }.flatten!

    ap todays_minyans
    ap upcoming_minyans

    todays_minyans.each {|e| e.confirmation_message}
    upcoming_minyans.each {|e| e.reminder_message}
  end

  def confirmation_message
     EventMailer.confirmation(self)
    # SMS code to go here when ready
  end
  
  def reminder_message
    EventMailer.reminder(self)
    # SMS code to go here when ready
  end

  def cancel_message
    EventMailer.cancellation(self)
    # SMS code to go here when ready
  end

  def success_message
    # Send email and SMSs
    EventMailer.success(self)
    # SMS code to go here when ready
  end

  # Who should be notified on reminder emails to ask people to come
  # PENDING: Implment opt out of emails
  def reminder_recipients
    # For reminders we will not bother anyone who has already confirmed
    # so we sent to all of the regulars LESS those who has RSVP'd
    (minyan.yids - yids)
  end

  # Who should be notified on confirmation emails that an event
  # is happening/not-happening
  # PENDING: Implment opt out of emails
  def confirmation_recipients
    # First we find all the email addresses we can for this event. This
    # means all regulars of the minyan, and everyone who has RSVP'd. This
    # isn't just a reminder it's a status update
    
    ((yids + minyan.yids).uniq).select{ |r| not r.email.blank? }
  end
end
