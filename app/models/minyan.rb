class Minyan < ActiveRecord::Base
  has_many   :events, dependent: :destroy
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

  def event_for_date(date)
    event = events.find_by_date(date)
    if not event
      event = events.create(date: date)
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

  # Get all the minyans for a range of days from a given date
  def upcoming_period(days, from_date=Date.today())
    upcoming = []
    to_date = from_date + days
    next_date = next_minyan(from_date)

    # Iterate updating the next date coming at end of each loop and checking up front
    # so that we don't go one over and can deal with the situation where there are no
    # minyans in given period
    while next_date < to_date
      upcoming << event_for_date(next_minyan(next_date))
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
