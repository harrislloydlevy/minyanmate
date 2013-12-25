class Yid < ActiveRecord::Base
  has_many :rsvps
  has_many :minyan_events, through: :rsvps
  has_many :owns, foreign_key: :owner_id, class_name: "Minyan"

  validates :name, presence: true
  validates :email, format: { with: /\A([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})\Z/i }
end
