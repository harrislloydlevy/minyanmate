class Rsvp < ActiveRecord::Base
  belongs_to :event
  belongs_to :yid

  validates_uniqueness_of :event_id, :scope => :yid_id
  validates_uniqueness_of :yid_id, :scope => :event_id

  after_create :check_minyan
  before_destroy :check_cancel
  
  private
    def check_minyan
      # This is called after an RSVP has been added. If we have 10 now send
      # out message.
      if event.num_rsvps == 10
        event.success_message
      end
    end

    def check_cancel
      # This is called after an RSVP has been removed. If we have 9 now that
      # the 10th just cancelled, so send out a message.
      if event.num_rsvps == 10
        event.cancel_message
      end
    end
end
