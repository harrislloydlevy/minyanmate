class Regular < ActiveRecord::Base
  belongs_to :yid
  belongs_to :minyan
  validates_uniqueness_of :minyan_id, :scope => :yid_id
end
