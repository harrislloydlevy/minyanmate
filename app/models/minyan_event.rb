class MinyanEvent < ActiveRecord::Base
  belongs_to :minyan
  has_many :rsvps, dependent: :destroy
  has_many :yids, through: :rsvps

  validates :date, presence: :true

  def confirm_attend(yid)
    self.rsvps.create(yid: yid)
  end
end
