class MinyanEvent < ActiveRecord::Base
  belongs_to :minyan
  has_many :rsvps, dependent: :destroy
  has_many :yids, through: :rsvps

  validates :date, presence: :true

  def in_attendance(yid)
    self.yid_ids.include?(yid.id)
  end


end
