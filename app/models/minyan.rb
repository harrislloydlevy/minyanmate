class Minyan < ActiveRecord::Base
  has_many   :minyan_events, dependent: :destroy
  has_many   :regulars
  has_many   :yids, through: :regulars
  belongs_to :owner, class_name: "Yid"

  validates :title, presence: true,
                    length: {minimum: 5}

  validate :has_recurrence?

  # Make sure that there is at least one regular day set for each minyan
  def has_recurrence?
    if not (sun || mon || tue || wed || thu || fri || sat)
      errors.add(:mon, "Minyan must have at least one regular day. " +
                       "Sorry, more complicated recurrence not supported.")
    end
  end

  def confirm_attend_date(yid, date)
    event = event_for_date(date)
    event.rsvps.create(yid: yid)
  end

  def event_for_date(date)
    event = minyan_events.find_by_date(date)
    if not event
      event = minyan_events.create(date: date)
    end

    return event
  end

  def next_minyan(date = Date.today())
    while not is_valid_date(date)
      date += 1
    end
    date
  end

  # Return upcoming minyans sorted by date, earliest first
  def upcoming(n=10, date=Date.today())
    next_date = date
    upcoming = []
    while n > 0 do
      upcoming << event_for_date(next_minyan(next_date))
      n -= 1
      # Start looking for day after last confirmed event
      next_date = upcoming.last.date + 1
    end
    return upcoming
  end

  def is_valid_date(date)
    (
      (sun && date.sunday?) ||
      (mon && date.monday?) ||
      (tue && date.tuesday?) ||
      (wed && date.wednesday?) ||
      (thu && date.thursday?) ||
      (fri && date.friday?) ||
      (sat && date.saturday?)
    )
  end 

  # Return an array of days on which the Minyans is held
  def days
    result = []
    result << "Sun" if sun
    result << "Mon" if mon
    result << "Tue" if tue
    result << "Wed" if wed
    result << "Thu" if thu
    result << "Fri" if fri
    result << "Sat" if sat
    return result
  end

  def is_regular?(yid)
    yid && Regular.exists?(yid_id: yid.id, minyan_id: self.id)
  end
end
