class Rsvp < ActiveRecord::Base
  belongs_to :minyan_event
  belongs_to :yid

  validates_uniqueness_of :minyan_event_id, :scope => :yid_id
end
