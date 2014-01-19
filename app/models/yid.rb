class Yid < ActiveRecord::Base
  has_many :rsvps
  has_many :minyan_events, through: :rsvps
  has_many :regulars
  has_many :minyans, through: :regulars
  has_many :owns, foreign_key: :owner_id, class_name: "Minyan"
  validates_uniqueness_of :uid, :scope => :provider
  validates_uniqueness_of :email 
  validates_uniqueness_of :phone
  validates :name, presence: true
  validates :email, format: { with: /\A([^@\s]+)@((?:[-a-z0-9]+\.)+[a-z]{2,})\Z/i }

  # Method to populate from login infrom from oauth gem
  def self.from_omniauth(auth)
    where(auth.slice(:provider, :uid)).first_or_initialize.tap do |yid|
      yid.provider = auth.provider
      yid.uid = auth.uid
      yid.email = auth.info.email
      yid.name = auth.info.name
      yid.oauth_token = auth.credentials.token
      yid.oauth_expires_at = Time.at(auth.credentials.expires_at)
    end
  end
end
