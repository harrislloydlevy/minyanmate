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

  def reminder
      # Send email and SMSs
    EventMailer.reminder(self)
  end

  def cancel_messages
    # Send email and SMSs
    EventMailer.cancellation(self)
  end

  def success_messages
    # Send email and SMSs
    EventMailer.success(self)
  end
end
