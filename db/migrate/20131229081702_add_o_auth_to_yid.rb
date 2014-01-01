class AddOAuthToYid < ActiveRecord::Migration
  def change
    add_column :yids, :provider, :string
    add_column :yids, :uid, :string
    add_column :yids, :oauth_token, :string
    add_column :yids, :oauth_expires_at, :datetime
  end
end
