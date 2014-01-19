class Rsvp < ActiveRecord::Base
  belongs_to :event
  belongs_to :yid

  validates_uniqueness_of :event_id, :scope => :yid_id
end
